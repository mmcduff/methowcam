from collections import defaultdict
import datetime
import json
import os.path
import re
import time
import urllib, urllib.parse, urllib.request
import PIL
import PIL.Image as Image
import PIL.ImageDraw as ImageDraw
import PIL.ImageFont as ImageFont

START_DST = datetime.date(2020, 3, 8)
END_DST = datetime.date(2020, 11, 1)

def make_request(url):
    response = urllib.request.urlopen(urllib.request.Request(url))
    return response.read()

def make_request_json(url):
    return json.loads(make_request(url))

def get_times_for_day(d):
    url = f'https://api.methowcam.mmcduff.com/v1/get_images?camera=westhd&date={d.year}-{d.month:02d}-{d.day:02d}'
    images = make_request_json(url)
    return [re.search('\d\d-\d\d$', image[0]).group() for image in images]


def analyze_dates():
    startdate = datetime.date(year=2020, month=1, day=23)
    days = [startdate + datetime.timedelta(days=x) for x in range(366)]

    counts = defaultdict(int)
    for day in days:
        print(day, end='     ')
        times = set(get_times_for_day(day))
        if day >= START_DST and day < END_DST:
            offset = 1
        else:
            offset = 0
        for hour in [11, 12]:
            for minute in range(0, 60, 5):
                filestring = f"{hour+offset:02d}-{minute:02d}"
                actualstring = f"{hour:02d}-{minute:02d}"
                if filestring in times:
                    counts[actualstring] += 1
                    print(actualstring, end='  ')
                else:
                    print('     ', end='  ')
        print('')

    print('')
    print(counts)


def with_retries(f):
    try:
        return f()
    except Exception as e:
        if isinstance(e, urllib.error.HTTPError) and e.code == 403:
            raise e
        print(e)
        with_retries.count += 1
        if with_retries.count < 1000:
            time.sleep(5)
            return with_retries(f)
        raise e

with_retries.count = 0


def download_range(start_date, num_days, hour, minute, folder):
    for d in [start_date + datetime.timedelta(days=x) for x in range(num_days)]:
        if d >= START_DST and d < END_DST:
            offset = 1
        else:
            offset = 0
        fname = f"{d.year}-{d.month:02d}-{d.day:02d}-{hour+offset:02d}-{minute:02d}"
        url = "https://static.methowcam.mmcduff.com/westhd/" + fname
        fullpath = os.path.join(folder, fname + ".jpeg")
        if not os.path.exists(fullpath):
            def foo():
                try:
                    contents = make_request(url)
                except urllib.error.HTTPError:
                    return
                f = open(fullpath, 'wb')
                f.write(contents)
                f.close()

            with_retries(foo)

def draw_date(fullpath, d):
    img = Image.open(fullpath)
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype("SFNSMono.ttf", 80)
    draw.text((70, 50), f"{d.year}-{d.month:02d}-{d.day:02d}", font=font, fill='rgb(0, 0, 0)')
    img.save(fullpath)

def draw_dates(start_date, num_days, hour, minute, folder):
    for d in [start_date + datetime.timedelta(days=x) for x in range(num_days)]:
        if d >= START_DST and d < END_DST:
            offset = 1
        else:
            offset = 0
        fname = f"{d.year}-{d.month:02d}-{d.day:02d}-{hour+offset:02d}-{minute:02d}"
        fullpath = os.path.join(folder, fname + ".jpeg")
        if os.path.exists(fullpath):
            draw_date(fullpath, d)

# analyze_dates()
download_range(datetime.date(2020, 1, 23), 366, 11, 45, '/Users/mark_mcduff/noonimages')
draw_dates(datetime.date(2020, 1, 23), 366, 11, 45, '/Users/mark_mcduff/noonimages')
