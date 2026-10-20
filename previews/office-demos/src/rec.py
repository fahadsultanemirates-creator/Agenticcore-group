import sys,os,shutil,subprocess
from playwright.sync_api import sync_playwright
d,mode=sys.argv[1],sys.argv[2]
w,h,sc=(1280,800,1) if mode=='desktop' else (390,844,2)
fd=f'/tmp/fr-{d}-{mode}';shutil.rmtree(fd,True);os.makedirs(fd)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=sc)
    pg.goto(f'file:///workspace/group-demos/{d}/index.html');pg.wait_for_load_state('networkidle')
    for i in range(28*25):
        pg.evaluate(f'__acdSeek({i/25})');pg.screenshot(path=f'{fd}/{i:04d}.jpg',quality=92)
    b.close()
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','25','-i',f'{fd}/%04d.jpg','-c:v','libx264','-pix_fmt','yuv420p','-crf','26','-preset','slow','-movflags','+faststart',f'{d}/{d}-{mode}.mp4'],check=True)
shutil.rmtree(fd)
