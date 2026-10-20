import sys
from playwright.sync_api import sync_playwright
d=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h,sc in [(1280,800,1),(360,780,2),(390,844,2),(430,932,2)]:
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=sc)
        errs=[];pg.on('requestfailed',lambda r:errs.append(r.url))
        pg.goto(f'file:///workspace/group-demos/{d}/index.html');pg.wait_for_load_state('networkidle')
        ov=pg.evaluate('document.documentElement.scrollWidth')
        print(w,'scrollWidth',ov,'failed',errs)
        for t in ts:
            pg.evaluate(f'__acdSeek({t})');pg.wait_for_timeout(80)
            pg.screenshot(path=f'{d}/still-{w}-t{t:g}.png',full_page=w<1000)
        pg.close()
    b.close()
