from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import uuid
import psutil
import datetime
import time
from threading import Thread
from model import sample
from fire import Fire
from multiprocessing import Manager
from multiprocessing import Process, Value
import shutil

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

if not os.path.exists('outputs'):
    os.makedirs("outputs")

p = None
active_tasks = []

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    process_id = db.Column(db.Integer)
    status = db.Column(db.Boolean)
    message = db.Column(db.String(255))
    time_start = db.Column(db.Float)
    time_end = db.Column(db.Float)

def send_update():
    """
    Отправка события update_files с текущими данными по сокету.
    """
    folder_path = os.path.join(os.getcwd(), "outputs")
    files = []
    for f in os.listdir(folder_path):
        file_path = os.path.join(folder_path, f)
        if os.path.isfile(file_path):
            file_name, file_extension = os.path.splitext(f)
            creation_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
            file_info = {'name': file_name, 'extension': file_extension, 'creation_time': creation_time}
            files.append(file_info)

    # Получение информации о памяти
    memory_info = psutil.virtual_memory()
    total_memory = round(memory_info.total / (1024 ** 2), 2)  # в мегабайтах
    used_memory = round(memory_info.used / (1024 ** 2), 2)
    free_memory = round(memory_info.available / (1024 ** 2), 2)

    with app.app_context():
        tasks = Task.query.all()
        task_data = [{'id': task.id, 'process_id': task.process_id, 'status': task.status,
                    'message': task.message, 'time_start': task.time_start, 'time_end': task.time_end}
                    for task in tasks]

    socketio.emit('update_files', {'task': task_data, 'files': files, 'total_memory': total_memory,
                                   'used_memory': used_memory, 'free_memory': free_memory})

def background_task():
    while True:
        send_update()
        socketio.sleep(2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_files', methods=['GET'])
def get_files_route():
    """
    Обертка для send_update, используемая для HTTP-запросов.
    """
    send_update()
    return jsonify({'message': 'Data sent successfully'})

@app.route('/delete_file/<token>', methods=['DELETE'])
def delete_file(token):
    """
    Удаление файла по токену (по названию файла - filename)
    """
    folder_path = os.path.join(os.getcwd(), "outputs")
    
    for f in os.listdir(folder_path):
        file_name, file_extension = os.path.splitext(f)
        if file_name == token:
            file_path = os.path.join(folder_path, f"{file_name}{file_extension}")
            print(file_path)
            if os.path.exists(file_path):
                os.remove(file_path)

                send_update()
                return jsonify({'message': 'File deleted successfully'})
            else:
                return jsonify({'error': 'File not found'})
        
    return jsonify({'error': 'File not found'})

def get_filename_by_token(token):
    """
    Получаем путь к файлу, по токену (названию файла)
    """
    listdir = os.path.join(os.getcwd(), 'outputs')
    dir = os.listdir(listdir)
    for file in dir:
        if file.split(".")[0] == token:
            return file
            break

@app.route('/delete_task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        task = Task.query.get(task_id)
        if task:
            db.session.delete(task)
            db.session.commit()
            return jsonify({'message': 'Task deleted successfully'}), 200
        else:
            return jsonify({'error': 'Task not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clear_tasks', methods=['DELETE'])
def clear_tasks():
    try:
        Task.query.delete()
        db.session.commit()
        return jsonify({'message': 'All database deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

def generate_video_process(input_path, num_frames, num_steps, version, fps_id, motion_bucket_id, cond_aug, seed,
                            decoding_t, device, output_folder, task_result, process_pid):
    try:
        Fire(sample(
            input_path,
            num_frames,
            num_steps,
            version,
            fps_id,
            motion_bucket_id,
            cond_aug,
            seed,
            decoding_t,
            device,
            output_folder
        ))

        with app.app_context():
            update_task(process_pid.value, True, "The video has been successfully created", time.time())
            active_tasks.append(task_result)
            print('The video has been successfully created')
    except Exception as e:
        with app.app_context():
            update_task(process_pid.value, False, str(e), time.time())
            print(e)
            task_result.value = False

def update_task(process_id, status, message, time_end):
    task = Task.query.filter_by(process_id=process_id).first()

    if task:
        task.status = status
        task.message = message
        task.time_end = time_end
        db.session.commit()

@app.route('/generatevideo', methods=['POST'])
def generate_video():
    try:
        uploaded_files = []
        if 'file' not in request.files:
            return jsonify({"message": "No file part", "status": False}), 400
        files = request.files.getlist('file')
        if not files:
            return jsonify({"message": "No files uploaded", "status": False}), 400

        uploads_folder = os.path.join(os.getcwd(), "uploads")
        for file_name in os.listdir(uploads_folder):
            file_path = os.path.join(uploads_folder, file_name)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                return jsonify({"message": f"Failed to delete {file_path}. Reason: {e}", "status": False}), 400

        files = request.files.getlist('file')
        for file in files:
            if file and allowed_file(file.filename):
                filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                uploaded_files.append(filename)

        if len(uploaded_files) == 0:
            return jsonify({"message": "No file part", "status": False}), 400

        select_version = request.form.get('select_version')
        fps_version = request.form.get('fps_version')
        num_steps = request.form.get('num_steps')
        fps_id = request.form.get('fps_id')
        motion_bucket = request.form.get('motion_bucket')
        cond_aug = request.form.get('cond_aug')
        seed = request.form.get('seed')
        decoding_t = request.form.get('decoding_t')

        input_path = os.path.join(os.getcwd(), "uploads", uploaded_files[0])
        num_frames = int(fps_version)
        num_steps = int(num_steps)
        version = str(select_version)
        fps_id = int(fps_id)
        motion_bucket_id = int(motion_bucket)
        cond_aug = float(cond_aug)
        seed = int(seed)
        decoding_t = int(decoding_t)
        device = "cuda"
        output_folder = os.path.join(os.getcwd(), "outputs")
        
        process_pid = Value('i', 0)
        p = Process(target=generate_video_process, args=(input_path, num_frames, num_steps, version, fps_id, motion_bucket_id,
                                                         cond_aug, seed, decoding_t, device, output_folder, task_result, process_pid))
        p.start()
        if p is not None:
            process_pid.value = p.pid

            task = Task(process_id=process_pid.value, status=None, message="Processing...", time_start=time.time(), time_end=None)
            db.session.add(task)
            db.session.commit()

        return jsonify({"message": "Success!", "status": True, "task_id": process_pid.value})
    except Exception as e:
        return jsonify({"message": str(e), "status": False}), 400

@app.route('/download/<filename>')
def download_file(filename):
    """
    Получение файла по ссылке, для скачивания
    """

    folder_path = os.path.join(os.getcwd(), 'outputs')
    return send_from_directory(folder_path, filename, as_attachment=True)

def allowed_file(filename):
    """
    Проверка разрешенных расширений файлов
    """
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    # pip install python-dotenv
    # flask db init
    # flask db migrate -m "Initial migration"
    # flask db upgrade

    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

    with app.app_context():
        manager = Manager()
        task_result = manager.Event()

        socketio.start_background_task(target=background_task)
        socketio.run(app, debug=True, host="0.0.0.0", port=5434)
