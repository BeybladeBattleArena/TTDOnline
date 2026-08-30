from pathlib import Path
p=Path('scripts/check-moving-screen-mobile-runtime-v1.mjs')
s=p.read_text()
old="for(const marker of ['LOADING_DECODE_MAX_MS=2500','img.loading=\\'eager\\'','img.decode()','Promise.all([sleep(LOADING_MIN_MS)','startPresentationSync()','announceActive(true)'])must(src.router.includes(marker),`Decoded loading transition contract missing: ${marker}`);"
new="for(const marker of ['LOADING_DECODE_MAX_MS=2500',\"const loadingMaster=new Image()\",\"loadingMaster.loading='eager'\",'loadingMaster.decode()','LOADING_BLACK_MS=170','LOADING_GAME_HOLD_MS=520',\"loading.root.classList.add('art')\",\"root.classList.remove('vis')\",'startPresentationSync()','announceActive(true)'])must(src.router.includes(marker),`Decoded loading transition contract missing: ${marker}`);"
if old not in s: raise SystemExit('mobile-runtime loading validator anchor missing')
p.write_text(s.replace(old,new,1))
