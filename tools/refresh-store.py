#!/usr/bin/env python3
"""Public prices only. Never reads account/library data. Preserve failed sources with original timestamps."""
import argparse, hashlib, html, json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
URLS={'Nintendo':'https://www.nintendo.com/us/store/sales-and-deals/','noon':'https://www.noon.com/saudi-en/search/?q=nintendo%20switch%20games','Amazon.sa':'https://www.amazon.sa/s?k=nintendo+switch+games&s=price-asc-rank'}
GENRES={'Action':'أكشن','Adventure':'مغامرات','Role-Playing':'تقمص أدوار','RPG':'تقمص أدوار','Platformer':'منصات','Racing':'سباقات','Puzzle':'ألغاز','Simulation':'محاكاة','Sports':'رياضة','Party':'حفلات','Strategy':'استراتيجية'}
def strip(s):return html.unescape(re.sub('<[^>]+>',' ',s)).strip()
def walk(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
def nintendo(source,stamp):
 m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',source,re.S)
 if not m:raise ValueError('Nintendo schema unavailable')
 found={}
 for p in walk(json.loads(m[1])):
  if 'sortFinalPrice' not in p or p.get('topLevelCategory',{}).get('code')!='GAMES' or p.get('dlcType'):continue
  prices=p.get('prices') or {};slug=p.get('urlKey','');platform=p.get('platform','')
  if not isinstance(platform,str) or platform not in ['Nintendo Switch','Nintendo Switch 2'] or not slug:continue
  image=(p.get('productImageSquare') or {}).get('url','');gallery=p.get('productGallery') or [];v=next((x.get('publicId') for x in gallery if x.get('resourceType')=='video'),None)
  genres=p.get('gameGenreLabels') or [];genre=next((GENRES[g] for g in genres if g in GENRES),'أخرى')
  found[slug]={'id':'eshop-'+slug,'title':p['name'],'platform':'Switch 2' if '2' in platform else 'Switch','format':'digital','merchant':'Nintendo','currency':'USD','price':prices.get('finalPrice'),'regular':prices.get('regularPrice'),'endsAt':p.get('sortdiscountPriceEnd') or '', 'checkedAt':stamp,'url':'https://www.nintendo.com/us/store/products/'+slug+'/','cover':image,'genre':genre,'publisher':p.get('softwarePublisher') or '', 'releaseDate':p.get('releaseDate') or '', 'players':p.get('playerCount') or '', 'rating':p.get('contentRatingCode') or '', 'trailer':'https://assets.nintendo.com/video/upload/'+v.strip('/')+'.mp4' if v else '', 'region':'US'}
 return list(found.values())
def noon(source,stamp):
 out={}
 for href,body in re.findall(r'<a\b[^>]*href="([^"]+/p/[^\"]*)"[^>]*>(.*?)</a>',source,re.S):
  name=re.search(r'data-qa="plp-product-box-name"[^>]*>(.*?)</h2>',body,re.S);price=re.search(r'<strong class="[^"]*amount[^\"]*">(.*?)</strong>',body,re.S);old=re.search(r'<span class="[^"]*oldPrice[^\"]*">(.*?)</span>',body,re.S)
  if not name or not price:continue
  title=strip(name[1]);low=title.lower()
  # Search results also contain consoles/accessories. Accept explicit game platform/genre listings only.
  if not re.search(r'nintendo_switch',low) or re.search(r'console|standalone|controller|case|protector|charging|joy.con|carrying|thumb|headset|memory card|adapter|oled|neon|standalone',low):continue
  image=re.search(r'<img[^>]*src="(https://f.nooncdn.com/p/[^\"]+)"',body);ident=re.search(r'/([A-Z0-9]+)/p/',href)
  if not ident:continue
  p=float(strip(price[1]).replace(',',''));r=float(strip(old[1]).replace(',','')) if old else p
  genre=next((v for k,v in GENRES.items() if k.lower() in low),'أخرى')
  out[ident[1]]={'id':'noon-'+ident[1],'title':title,'platform':'Switch 2' if re.search(r'switch\s*2',low) else 'Switch','format':'physical','merchant':'noon','currency':'SAR','price':p,'regular':r,'endsAt':'','checkedAt':stamp,'url':'https://www.noon.com'+html.unescape(href) if href.startswith('/') else html.unescape(href),'cover':html.unescape(image[1]) if image else '', 'genre':genre,'delivery':'confirm-at-checkout','region':'SA'}
 return list(out.values())
def amazon(source,stamp):
 out=[]
 # Public search result cards only; do not guess prices from recommendations or snippets.
 for asin,body in re.findall(r'data-asin="([A-Z0-9]{10})"(.*?)(?=data-asin=|$)',source,re.S):
  name=re.search(r'<h2[^>]*>.*?<span[^>]*>(.*?)</span>',body,re.S);price=re.search(r'class="a-offscreen">SAR\s*([\d,.]+)',body)
  if not name or not price:continue
  title=strip(name[1]);low=title.lower()
  if not re.search(r'nintendo switch|switch 2',low) or re.search(r'console|controller|case|protector|charger|joy.con|standalone',low):continue
  image=re.search(r'<img[^>]*class="s-image"[^>]*src="([^"]+)"',body)
  out.append({'id':'amazon-'+asin,'title':title,'platform':'Switch 2' if re.search(r'switch\s*2',low) else 'Switch','format':'physical','merchant':'Amazon.sa','currency':'SAR','price':float(price[1].replace(',','')),'regular':None,'endsAt':'','checkedAt':stamp,'url':'https://www.amazon.sa/dp/'+asin,'cover':html.unescape(image[1]) if image else '', 'genre':'أخرى','delivery':'confirm-at-checkout','region':'SA'})
 return out

def record_history(previous,offers):
 history={}
 for ident,rows in (previous.get('history') or {}).items():
  if isinstance(rows,list):history[ident]=[r for r in rows if isinstance(r,dict) and isinstance(r.get('price'),(int,float)) and r['price']>=0 and r.get('currency') in ['USD','SAR'] and isinstance(r.get('at'),str)][-180:]
 for o in offers:
  if not isinstance(o.get('price'),(int,float)) or not o.get('checkedAt'):continue
  rows=history.setdefault(o['id'],[]);point={'at':o['checkedAt'],'price':o['price'],'currency':o['currency']}
  # One unchanged observation per UTC day, plus price changes. Failed-source timestamps do not create new observations.
  if not any(r['at']==point['at'] for r in rows) and (not rows or rows[-1]['at'][:10]!=point['at'][:10] or rows[-1]['price']!=point['price'] or rows[-1]['currency']!=point['currency']):rows.append(point)
  rows.sort(key=lambda r:r['at']);history[o['id']]=rows[-180:]
 return dict(list(history.items())[-3000:])

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--fixtures');args=parser.parse_args();path=ROOT/'store-data.json';previous=json.loads(path.read_text()) if path.exists() else {'offers':[]};stamp=datetime.now(timezone.utc).isoformat();offers=[];sources=[]
 for merchant,fn,fixture in [('Nintendo',nintendo,'shop-nintendo.html'),('noon',noon,'shop-noon.html'),('Amazon.sa',amazon,'shop-amazon.html')]:
  try:
   if args.fixtures:source=(Path(args.fixtures)/fixture).read_text()
   else:
    req=urllib.request.Request(URLS[merchant],headers={'User-Agent':'Mozilla/5.0 (compatible; public-price-snapshot/1.0)'})
    with urllib.request.urlopen(req,timeout=30) as res:source=res.read(8_000_000).decode('utf-8')
   rows=fn(source,stamp)
   if not rows:raise ValueError('No recognized products')
   offers.extend(rows);sources.append({'id':merchant,'status':'ok','checkedAt':stamp});print(merchant,len(rows))
  except Exception as e:
   offers.extend(x for x in previous['offers'] if x.get('merchant')==merchant);sources.append({'id':merchant,'status':'unavailable','checkedAt':stamp});print(merchant,'unavailable:',type(e).__name__)
 result={'version':1,'updatedAt':stamp,'sources':sources,'offers':offers,'history':record_history(previous,offers)};path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
