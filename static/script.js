$('.generate').attr('disabled', true)

document.addEventListener('DOMContentLoaded', function() {
    const socket = io.connect(document.URL);
    
    socket.on('connect', () => {
        $.toast({
            heading: 'Connected to server',
            text: "Connected to server successfully",
            icon: 'info',
            loader: true,
            loaderBg: '#9EC600'
        })

        // Обновление полного списка файлов в ./videos
        socket.on('update_files', function(data) {
            history_production(data.task)
            updateMemoryInfo(data);
            updateFileList(data.files);
        });
        socket.emit('update_files'); 
    });

    $('#clear_all_db').click(()=>{
        $.ajax({
            method: 'DELETE',
            url: '/clear_tasks',
        }).done(function (msg) {
            $.toast({
                heading: 'Cleaning the database',
                text: `[DONE]: ${msg.message}`,
                icon: 'info',
                loader: true,
                status: "info",
                loaderBg: '#9EC600',
            })
            $('.history_created_video').html("")

            $('.db_history').addClass('hidden')

            $('.result_video .alert').removeClass('hidden')
            $('.result_video .alert .loader').addClass('hidden')
            $('.result_video .alert .db_empty').removeClass('hidden')

        }).fail(function (xhr, status, error) {
            var errorMessage = xhr.status + ': ' + xhr.statusText;
            $.toast({
                heading: 'Cleaning the database',
                text: `[${errorMessage}]: ${xhr.responseJSON.message}`,
                icon: 'error',
                loader: true,
                status: "error",
                loaderBg: '#f3450b',
                bgColor: '#ee3c25',
            })
        });
    })

    function history_production(data){
        if (data && data[0]){
            let html = ``
            data.reverse().map((item, idx)=>{
                let status = ""
                if (item.status == null){
                    status = `<span class="loader"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"></path><path d="M18.364 5.636 16.95 7.05A7 7 0 1 0 19 12h2a9 9 0 1 1-2.636-6.364z" fill="#ffffff" class="fill-000000"></path></svg></span>`
                }else if(item.status == true){
                    status = `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><path d="M58.395 32.156 42.995 50.625l-5.39-6.463a5.995 5.995 0 1 0-9.212 7.676l9.997 12a5.991 5.991 0 0 0 9.21.006l20.005-24a5.999 5.999 0 1 0-9.211-7.688Z" fill="#14ff72" class="fill-000000"></path><path d="M48 0a48 48 0 1 0 48 48A48.051 48.051 0 0 0 48 0Zm0 84a36 36 0 1 1 36-36 36.04 36.04 0 0 1-36 36Z" fill="#14ff72" class="fill-000000"></path></svg>`
                }else{
                    status = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g data-name="1"><path d="M257 461.46c-114 0-206.73-92.74-206.73-206.73S143 48 257 48s206.73 92.74 206.73 206.73S371 461.46 257 461.46ZM257 78c-97.45 0-176.73 79.28-176.73 176.73S159.55 431.46 257 431.46s176.73-79.28 176.73-176.73S354.45 78 257 78Z" fill="#ff3838" class="fill-000000"></path><path d="M342.92 358a15 15 0 0 1-10.61-4.39L160.47 181.76a15 15 0 1 1 21.21-21.21L353.53 332.4a15 15 0 0 1-10.61 25.6Z" fill="#ff3838" class="fill-000000"></path><path d="M171.07 358a15 15 0 0 1-10.6-25.6l171.84-171.85a15 15 0 0 1 21.22 21.21L181.68 353.61a15 15 0 0 1-10.61 4.39Z" fill="#ff3838" class="fill-000000"></path></g></svg>`
                }
                let timestamp = item.time_start * 1000;
                let dateObject = new Date(timestamp);
                let datePart = dateObject.toLocaleDateString();
                let timePart = dateObject.toLocaleTimeString();
                html += `
                <div class="box">
                    <span process="${item.process_id}">Video generation</span>
                    <span>${item.message}</span>
                    <span class="center">${datePart} ${timePart}</span>
                    <span class="center">${status}</span>
                    <button class="delete_el_db" id-db="${item.id}">
                        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h48v48H0V0z" fill="none"></path><path d="M12 38c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V14H12v24zm4.93-14.24 2.83-2.83L24 25.17l4.24-4.24 2.83 2.83L26.83 28l4.24 4.24-2.83 2.83L24 30.83l-4.24 4.24-2.83-2.83L21.17 28l-4.24-4.24zM31 8l-2-2H19l-2 2h-7v4h28V8z" fill="#ff2121" class="fill-000000"></path><path d="M0 0h48v48H0z" fill="none"></path></svg>
                    </button>
                </div>
                `;
            })
            $('.history_created_video').html(html)

            $('.result_video .alert').addClass('hidden')
            $('.db_history').removeClass('hidden')

            $('.result_video .alert .loader').removeClass('hidden')
            $('.result_video .alert .db_empty').addClass('hidden')

            $('.delete_el_db').click((e)=>{
                let target = $(e.target)
                target = $(target).closest('.delete_el_db')
                let id = $(target).attr('id-db')
                $.ajax({
                    method: 'DELETE',
                    url: `/delete_task/${id}`,
                }).done(function (msg) {
                    $.toast({
                        heading: 'Deleting a record from the database',
                        text: `[DONE]: ${msg.message}`,
                        icon: 'info',
                        loader: true,
                        status: "info",
                        loaderBg: '#9EC600',
                    })

                    if ($('.history_created_video').children().length == 0) {
                        $('.result_video .alert').removeClass('hidden');
                        $('.db_history').addClass('hidden');
                    }

                    $(target).closest('.box').remove()
                }).fail(function (xhr, status, error) {
                    var errorMessage = xhr.status + ': ' + xhr.statusText;
                    $.toast({
                        heading: 'Deleting a record from the database',
                        text: `[${errorMessage}]: ${xhr.responseJSON.message}`,
                        icon: 'error',
                        loader: true,
                        status: "error",
                        loaderBg: '#f3450b',
                        bgColor: '#ee3c25',
                    })
                });
            })

        }else{
            $('.history_created_video').html("")

            $('.result_video .alert').removeClass('hidden');
            $('.db_history').addClass('hidden');

            $('.result_video .alert .loader').addClass('hidden')
            $('.result_video .alert .db_empty').removeClass('hidden')
        }
    }

    function generation_video() {
        const input = document.getElementById('file-input');
        const file = input.files[0];
        console.log(file)
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                let image = file;
    
                let select_version = document.getElementById('select-version').value;
                let fps_version = document.getElementById('fps-version').value;
                let num_steps = document.getElementById('num_steps').value;
                let fps_id = document.getElementById('fps_id').value;
                let motion_bucket = document.getElementById('motion_bucket').value;
                let cond_aug = document.getElementById('cond_aug').value;
                let seed = document.getElementById('seed').value;
                let decoding_t = document.getElementById('decoding_t').value;
    
                let formData = new FormData();
                formData.append('file', image);
                formData.append('select_version', select_version);
                formData.append('fps_version', fps_version);
                formData.append('num_steps', num_steps);
                formData.append('fps_id', fps_id);
                formData.append('motion_bucket', motion_bucket);
                formData.append('cond_aug', cond_aug);
                formData.append('seed', seed);
                formData.append('decoding_t', decoding_t);

                // function update_task(pid){
                //     $.ajax({
                //         method: 'GET',
                //         url: `/get_result/${pid}`,
                //         processData: false,
                //         contentType: false,
                //         data: formData
                //     }).done(function (msg) {
                //         console.log(msg)
                //     }).fail(function (xhr, status, error) {
                //         var errorMessage = xhr.status + ': ' + xhr.statusText;
                //         $.toast({
                //             heading: 'Generate Video',
                //             text: `[${errorMessage}]: ${xhr.responseJSON.message}`,
                //             icon: 'info',
                //             loader: true,
                //             status: "error",
                //             loaderBg: '#f3450b',
                //             bgColor: '#ee3c25',
                //         })
                //     });
                // }
         
                $.ajax({
                    method: 'POST',
                    url: '/generatevideo',
                    processData: false,
                    contentType: false,
                    data: formData
                }).done(function (msg) {
                    $.toast({
                        heading: 'Generate Video',
                        text: `[DONE]: ${msg.message}`,
                        icon: 'info',
                        loader: true,
                        status: "info",
                        loaderBg: '#9EC600',
                    })

                    $('.result_video .alert').addClass('hidden')
                    $('.db_history').removeClass('hidden')

                    document.querySelector('.generate .text').style.display = 'flex'
                    document.querySelector('.generate .loader').style.display = 'none'
                }).fail(function (xhr, status, error) {
                    var errorMessage = xhr.status + ': ' + xhr.statusText;
                    $.toast({
                        heading: 'Generate Video',
                        text: `[${errorMessage}]: ${xhr.responseJSON.message}`,
                        icon: 'error',
                        loader: true,
                        status: "error",
                        loaderBg: '#f3450b',
                        bgColor: '#ee3c25',
                    })
                    document.querySelector('.generate .text').style.display = 'flex'
                    document.querySelector('.generate .loader').style.display = 'none'
                });
            };
            reader.readAsDataURL(file);
        }
    }

    document.querySelector('.generate').addEventListener('click', ()=>{
        document.querySelector('.generate .text').style.display = 'none'
        document.querySelector('.generate .loader').style.display = 'flex'

        $('.result_video .alert').addClass('hidden')
        $('.db_history').removeClass('hidden')

        generation_video()
    })

    function updateMemoryInfo(memoryData) {
        document.getElementById('total-memory').innerText = memoryData.total_memory;
        document.getElementById('used-memory').innerText = memoryData.used_memory;
    }

    function updateFileList(files) {
        const fileList = document.getElementById('fileList');
        if(files[0] == undefined){
            fileList.innerHTML = `<div class="empty">
                <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm6.517 4.543L6.543 18.517A8.5 8.5 0 0 0 18.517 6.543ZM12 3.5a8.5 8.5 0 0 0-6.517 13.957L17.457 5.483A8.466 8.466 0 0 0 12 3.5Z" fill="#0c1d9e" class="fill-212121"></path></svg>
                <p>No files found</p>
            </div>`;
        }else{
            fileList.innerHTML = '';
            
            files.forEach(file => {
                const fileBlock = document.createElement('div');
                fileBlock.className = "fileLine"
                fileBlock.innerHTML = `
                    <span>
                        <span>${file.name}</span>
                        <span class="time">${file.creation_time}</span>
                    </span>
                    <button class="downloadFile" data-ex="${file.extension}" data-uuid="${file.name}">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24"><g id="_icons"><path d="M11.3 15.7c.1.1.2.2.3.2.1.1.3.1.4.1s.3 0 .4-.1c.1-.1.2-.1.3-.2l4-4c.4-.4.4-1 0-1.4s-1-.4-1.4 0L13 12.6V5c0-.6-.4-1-1-1s-1 .4-1 1v7.6l-2.3-2.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l4 4z" fill="#5c7dff" class="fill-000000"></path><path d="M19 13c-.6 0-1 .4-1 1v2c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-2c0-.6-.4-1-1-1s-1 .4-1 1v2c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4v-2c0-.6-.4-1-1-1z" fill="#5c7dff" class="fill-000000"></path></g></svg>
                    </button>
                    <button class="deleteFile" data-uuid="${file.name}">
                        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h48v48H0V0z" fill="none"></path><path d="M12 38c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V14H12v24zm4.93-14.24 2.83-2.83L24 25.17l4.24-4.24 2.83 2.83L26.83 28l4.24 4.24-2.83 2.83L24 30.83l-4.24 4.24-2.83-2.83L21.17 28l-4.24-4.24zM31 8l-2-2H19l-2 2h-7v4h28V8z" fill="#f22727" class="fill-000000"></path><path d="M0 0h48v48H0z" fill="none"></path></svg>
                    </button>
                `;
                fileList.appendChild(fileBlock);

                document.querySelectorAll('.downloadFile').forEach(el => {
                    el.addEventListener('click', (e) => {
                        let target = e.currentTarget;
                        let father = target.closest('.downloadFile');
                        let data_uuid = father.getAttribute('data-uuid');
                        let data_ex = father.getAttribute('data-ex');

                        downloadFile(data_uuid, data_ex)
                    });
                });

                document.querySelectorAll('.deleteFile').forEach(el => {
                    el.addEventListener('click', (e) => {
                        let target = e.currentTarget;
                        let father = target.closest('.deleteFile');
                        let data_uuid = father.getAttribute('data-uuid');

                        deleteFile(data_uuid)
                    });
                });

                
            });
        }
    }

    function downloadFile(filename, data_ex) {
        window.location.href = '/download/' + filename + "" + data_ex;
    }

    function deleteFile(filename) {
        console.log(filename)
        fetch('/delete_file/' + filename, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                $.toast({
                    heading: 'Delete file',
                    text: "File deleted successfully",
                    icon: 'info',
                    loader: true,
                    loaderBg: '#9EC600'
                })
                socket.emit('update_files');
            }
        })
        .catch(error => console.error('Error:', error));
    }

});

document.querySelectorAll('.numeric-input input').forEach((item)=>{
    item.addEventListener('input', (e)=>{
        validateNumericInput(e.currentTarget)
    })
})

function validateNumericInput(input) {
    const minValue = parseInt(input.getAttribute('min'))
    const maxValue = parseInt(input.getAttribute('max'))
    let value = parseInt(input.value, 10);
    if (isNaN(value)) {
        value = minValue;
    }

    if (value < minValue) {
        value = minValue;
    } else if (value > maxValue) {
        value = maxValue;
    }

    input.value = value;
}

document.querySelector('#select-version').addEventListener('change', ()=>{
    let val = document.querySelector('#select-version').value;
    if (val == "svd_xt"){
        document.querySelector('#fps-version').value = "25"
    }else{
        document.querySelector('#fps-version').value = "14"
    }
})

// Controllers
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.box_button');
    const boxes = document.querySelectorAll('.box');
    buttons.forEach((button, index) => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            boxes.forEach((box, boxIndex) => {
                if (index === boxIndex) {
                    box.style.display = 'flex';
                } else {
                    box.style.display = 'none';
                }
            });
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('drop-zone');
    const imagePreview = document.getElementById('image-preview');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('dragover', function(event) {
        event.preventDefault();
        dropZone.style.border = '2px dashed #2e5bec';
    });

    dropZone.addEventListener('dragleave', function() {
        dropZone.style.border = '1px dashed #ccc';
    });

    dropZone.addEventListener('drop', function(event) {
        event.preventDefault();
        dropZone.style.border = '1px dashed #ccc';

        const file = event.dataTransfer.files[0];
        handleFile(file);
    });

    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (file && isImage(file.name)) {
            const reader = new FileReader();
    
            reader.onload = function(e) {
                document.querySelector('#drop-zone .load').classList.add('hidden');
                document.querySelector('.generate').removeAttribute('disabled');
    
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Image Preview';
                imagePreview.innerHTML = '';
                imagePreview.appendChild(img);
                imagePreview.style.display = 'block';
    
                // Создаем новый FileList
                const newFileList = new DataTransfer();
                newFileList.items.add(new File([file], file.name));
    
                // Присваиваем новый FileList свойству files
                fileInput.files = newFileList.files;
            };
    
            reader.readAsDataURL(file);
        }
    }

    function isImage(filename) {
        const validExtensions = ['.png', '.jpg', '.jpeg'];
        const ext = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);

        return validExtensions.includes('.' + ext.toLowerCase());
    }
});