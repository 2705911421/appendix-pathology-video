set -e
python3 qa/v6/e06_s19/iris_video.py
python3 qa/v6/e06_s19/finish.py
python3 qa/v6/e06_s19/measure_output.py
python3 qa/v6/e06_s19/density.py
ffprobe -v quiet -show_format -show_streams -of json qa/v6/e06_s19/S19.mp4 > qa/v6/e06_s19/ffprobe.json
ffmpeg -v error -i qa/v6/e06_s19/S19.mp4 -f null - 2> qa/v6/e06_s19/decode_check.log
git diff --check
