"""Refresh small curated catalog from public Nintendo product metadata; no account access."""
import json, urllib.request, concurrent.futures, re
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Meta(HTMLParser):
 def __init__(self): super().__init__(); self.meta={}; self.images=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='meta': self.meta[d.get('property',d.get('name',''))]=d.get('content','')
  if t=='img': self.images.append(d)
rows=[('super-mario-odyssey-switch','Super Mario Odyssey','Switch','منصات'),('the-legend-of-zelda-tears-of-the-kingdom-switch','The Legend of Zelda: Tears of the Kingdom','Switch','مغامرات'),('super-mario-bros-wonder-switch','Super Mario Bros. Wonder','Switch','منصات'),('kirby-and-the-forgotten-land-switch','Kirby and the Forgotten Land','Switch','منصات'),('metroid-dread-switch','Metroid Dread','Switch','أكشن'),('mario-kart-world-switch-2','Mario Kart World','Switch 2','سباقات'),('donkey-kong-bananza-switch-2','Donkey Kong Bananza','Switch 2','منصات'),('animal-crossing-new-horizons-switch','Animal Crossing: New Horizons','Switch','محاكاة')]
def fetch(row):
 slug,title,platform,genre=row; url='https://www.nintendo.com/us/store/products/'+slug+'/'
 p=Meta(); p.feed(urllib.request.urlopen(url,timeout=35).read().decode())
 if not p.meta.get('og:image') or title.split(':')[0].lower() not in p.meta.get('og:title','').replace('™','').lower(): raise ValueError('Unexpected product '+slug)
 return dict(id=slug,title=title,platform=platform,genre=genre,cover=p.meta['og:image'],sourceUrl=url,sourceRegion='US',verifiedAt='2026-10-26',tier='owned')
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for row,result in zip(rows,pool.map(lambda r: (fetch(r)),rows)): results.append(result)
url='https://www.nintendo.com/au/hardware/nintendo-switch-online/classic-games/'
p=Meta();html=urllib.request.urlopen(url,timeout=35).read().decode();p.feed(html)
classic=[('Super Mario Bros. 3','NES','منصات'),('Super Mario World','SNES','منصات'),('The Legend of Zelda: A Link to the Past','SNES','مغامرات'),('Super Metroid','SNES','أكشن'),('Donkey Kong Country','SNES','منصات'),('Tetris','Game Boy','ألغاز'),("Kirby's Dream Land",'Game Boy','منصات'),('Super Mario 64','Nintendo 64','منصات'),('The Legend of Zelda: Ocarina of Time','Nintendo 64','مغامرات'),('Metroid Fusion','Game Boy Advance','أكشن'),('The Legend of Zelda: The Wind Waker','GameCube','مغامرات'),('F-ZERO GX','GameCube','سباقات')]
for i,(title,platform,genre) in enumerate(classic):
 if title.lower().replace("'",'') not in html.lower().replace('&#039;','').replace("'",'').replace('&#39;',''): print('Verify title manually:',title)
 matches=[x for x in p.images if x.get('alt','').casefold()==title.casefold()]
 cover=matches[0].get('src','') if matches else ''
 results.append(dict(id='nso-'+str(i+1),title=title,platform=platform,genre=genre,cover=cover,sourceUrl=url,sourceRegion='AU',verifiedAt='2026-10-26',tier='standard' if platform in ['NES','SNES','Game Boy'] else 'expansion'))
(ROOT/'catalog.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('Catalog:',len(results),'titles;',sum(bool(x['cover']) for x in results),'official images')
