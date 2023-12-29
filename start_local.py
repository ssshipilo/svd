from model import sample
from fire import Fire
import os
import torch

if __name__ == "__main__":
    # Путь к картинке - Это путь к изображению, которое будет использоваться для создания видео.
    input_path          = os.path.join(os.getcwd(), "assets", "photo_2023-12-27_17-59-20.jpg")
    num_frames          = 25    # Количесвто фреймов
    num_steps           = 15    # Количество шагов - Это параметр, указывающий, сколько шагов выполнить при создании видео.
    # Версия 
    # svd                       - обучен на 14 кадрах
    # svd_xt                    - утверждает, что обучается на 25 кадрах и настраивается на первом выше
    version             = "svd_xt" # or 'svd_xt'
    fps_id              = 6     # Число кадров в секунду - Это количество кадров в секунду для создаваемого видео.
    motion_bucket_id    = 127   # Идентификатор "motion bucket" - Это идентификатор, связанный с движением, который влияет на результат видео.
    cond_aug            = 0.02  # Условное увеличение - Это параметр, связанный с аугментацией данных.
    seed                = 23    # Зерно для генерации случайных чисел - Это начальное значение для генератора случайных чисел.
    decoding_t          = 5    # Количество кадров, декодируемых за один раз! Это съедает больше всего VRAM. При необходимости уменьшите.
    device              = "cuda" # or 'cpu'
    output_folder       =  os.path.join(os.getcwd(), "outputs")

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