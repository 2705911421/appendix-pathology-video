set -e
python3 qa/v6/e11_s19/iris_video.py
python3 qa/v6/e11_s19/audio_720p.py
python3 qa/v6/e11_s19/review.py > qa/v6/e11_s19/metrics.log
ffprobe -v quiet -show_format -show_streams -of json qa/v6/e11_s19/S19.mp4 > qa/v6/e11_s19/ffprobe.json
ffprobe -v quiet -show_format -show_streams -of json qa/v6/e11_s19/S19_带配音_720p.mp4 > qa/v6/e11_s19/ffprobe_audio_720p.json
ffmpeg -threads 1 -v error -i qa/v6/e11_s19/S19.mp4 -f null - 2> qa/v6/e11_s19/decode_check.log
ffmpeg -threads 1 -v error -i qa/v6/e11_s19/S19_带配音_720p.mp4 -f null - 2> qa/v6/e11_s19/decode_audio_check.log

python3 qa/v6/e11_s19/check_video.py > qa/v6/e11_s19/validation.log
git diff --check
