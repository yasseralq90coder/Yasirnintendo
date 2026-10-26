"""Fetch public Nintendo headlines and the regional NSO catalogue. Never reads account files."""
import json,re,html,urllib.request,hashlib,argparse,datetime
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NSO='https://www.nintendo.com/au/hardware/nintendo-switch-online/classic-games/'
NEWS='https://www.nintendo.com/us/whatsnew/'
class Images(HTMLParser):
 def __init__(self):super().__init__();self.images=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='img' and d.get('src','').startswith('https://assets.nintendo.'):self.images.append(d)
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'YasirNintendo-PublicCatalog/3.0'})
 return urllib.request.urlopen(req,timeout=40).read().decode('utf-8')
class Tree(HTMLParser):
 def __init__(self):super().__init__();self.root={'tag':'root','attrs':{},'children':[]};self.stack=[self.root];self.ids={}
 def handle_starttag(self,t,a):
  n={'tag':t,'attrs':dict(a),'children':[]};self.stack[-1]['children'].append(n)
  if n['attrs'].get('id'):self.ids[n['attrs']['id']]=n
  if t not in {'img','meta','link','input','br','hr','source','area','base','embed','param','wbr'}:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==t:self.stack=self.stack[:i];break
 def handle_startendtag(self,t,a):self.handle_starttag(t,a);self.handle_endtag(t)
def catalogue(text,stamp):
 names={'nes':('NES','standard'),'snes':('SNES','standard'),'game-boy':('Game Boy','standard'),'nintendo-64':('Nintendo 64','expansion'),'game-boy-advance':('Game Boy Advance','expansion'),'gamecube':('GameCube','expansion'),'sega-mega-drive':('SEGA Genesis','expansion')}
 tree=Tree();tree.feed(text);references=dict(re.findall(r'\$RC\("([^"]+)","([^"]+)"\)',text));out=[];seen=set()
 def images(node,inside=False,visited=None):
  visited=set() if visited is None else visited
  inside=inside or 'generic-card' in node['attrs'].get('class','').split()
  if node['tag']=='img' and inside:yield node['attrs']
  if node['tag']=='template':
   ref=references.get(node['attrs'].get('id'))
   if ref in tree.ids and ref not in visited:visited.add(ref);yield from images(tree.ids[ref],inside,visited)
  for child in node['children']:yield from images(child,inside,visited)
 for key,(platform,tier) in names.items():
  if key+'-content' not in tree.ids:continue
  for image in images(tree.ids[key+'-content']):
   title=html.unescape(image.get('alt','')).strip();identity=platform+'|'+title
   if not title or identity in seen or not image.get('src','').startswith('https://assets.nintendo.'):continue
   seen.add(identity);out.append({'id':'nso-'+hashlib.sha1(identity.encode()).hexdigest()[:16],'title':title,'platform':platform,'genre':'أخرى','cover':image['src'],'tier':tier,'sourceUrl':NSO,'sourceRegion':'AU','verifiedAt':stamp})
 if len(out)<20:raise ValueError('Nintendo catalogue shape changed; preserve previous successful catalogue')
 return out

def news(text,stamp):
 out=[];seen=set()
 for m in re.finditer(r'<a\b([^>]*href="/us/whatsnew/[^"#]+/"[^>]*)>(.*?)</a>',text,re.S):
  attrs,body=m.groups();u=re.search(r'href="([^"]+)"',attrs);title=re.search(r'aria-label="([^"]+)"',attrs);h=re.search(r'<h[23][^>]*>(.*?)</h[23]>',body,re.S)
  title=html.unescape(title[1] if title else re.sub('<[^>]+>','',h[1]) if h else '').strip();url='https://www.nintendo.com'+html.unescape(u[1]);date=re.search(r'>(\d{1,2})/(\d{1,2})/(\d{2})<',body)
  if not title or not date or url in seen:continue
  date=f'20{date[3]}-{int(date[1]):02d}-{int(date[2]):02d}'
  if date>stamp:continue
  p=Images();p.feed(body);cover=p.images[0]['src'] if p.images else '';seen.add(url)
  category='NSO' if re.search('classic|switch online|icon elements|game trial',title,re.I) else 'ألعاب' if re.search('game|mario|zelda|metroid|pokemon|pokémon|splatoon',title,re.I) else 'نينتندو'
  out.append({'id':hashlib.sha1(url.encode()).hexdigest()[:16],'title':title,'date':date,'url':url,'cover':cover,'category':category,'source':'Nintendo US'})
 if len(out)<3:raise ValueError('Nintendo news shape changed; preserve previous successful headlines')
 return sorted(out,key=lambda x:x['date'],reverse=True)[:30]
def extra_catalogue(text,platform,url,region,stamp):
 tree=Tree();tree.feed(text);out=[]
 def walk(n):
  yield n
  for child in n['children']:yield from walk(child)
 def entry(title,cover=''):
  identity=platform+'|'+title
  return {'id':'nso-'+hashlib.sha1(identity.encode()).hexdigest()[:16],'title':title,'platform':platform,'genre':'أخرى','cover':cover,'tier':'expansion','sourceUrl':url,'sourceRegion':region,'verifiedAt':stamp}
 if platform=='SEGA Genesis':
  marker=re.search(r'Included games:?</h2>',text,re.I)
  if not marker:raise ValueError('No Genesis title list')
  section=text[marker.end():];section=section[:section.find('</ul>')];covers={}
  for m in re.finditer(r'<img[^>]+src="([^"]+)"[^>]*>.*?<h2[^>]*>([^<]+)</h2>',text,re.S):
   if m[1].startswith('https://assets.nintendo.com/') and len(m[2])<150:covers[html.unescape(m[2]).casefold()]=html.unescape(m[1])
  for item in re.findall(r'<li[^>]*>(.*?)</li>',section,re.S):
   title=html.unescape(re.sub('<[^>]+>','',item)).strip()
   if title:out.append(entry(title,covers.get(title.casefold(),'')))
 else:
  sections=[n for n in walk(tree.root) if 'teaser-carousel-virtualboy' in n['attrs'].get('class','')]
  for section in sections:
   for n in walk(section):
    title=n['attrs'].get('data-nt-item-title') if n['tag']=='li' else ''
    if not title:continue
    images=[x['attrs'] for x in walk(n) if x['tag']=='img'];cover=next((x.get('data-xs') for x in images if x.get('data-xs','').startswith('https://www.nintendo.com/')),'')
    out.append(entry(html.unescape(title),cover))
 if len(out)<3:raise ValueError('No verified '+platform+' entries')
 return out

def main():
 args=argparse.ArgumentParser();args.add_argument('--local-source',type=Path);opt=args.parse_args();path=ROOT/'nintendo-world.json';data=json.loads(path.read_text()) if path.exists() else {};stamp=datetime.datetime.now(datetime.timezone.utc).date().isoformat();errors=[];previous_catalog=list(data.get('catalog',[]))
 for key,url,parser in [('catalog',NSO,catalogue),('news',NEWS,news)]:
  try:
   text=(opt.local_source/('nso-official.html' if key=='catalog' else 'news-official.html')).read_text() if opt.local_source else fetch(url)
   data[key]=parser(text,stamp);data[key+'UpdatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();print(key,len(data[key]))
  except Exception as e:errors.append(key+': '+str(e));print('Warning:',errors[-1])
 for platform,filename,url,region in [('SEGA Genesis','sega-official.html','https://www.nintendo.com/us/store/products/sega-genesis-nintendo-switch-online-switch/','US'),('Virtual Boy','vb-official.html','https://www.nintendo.com/en-gb/Games/Nintendo-Switch-download-software/Virtual-Boy-Nintendo-Classics-2915432.html','UK')]:
  try:
   text=(opt.local_source/filename).read_text() if opt.local_source else fetch(url)
   extra=extra_catalogue(text,platform,url,region,stamp);data['catalog']=[g for g in data.get('catalog',[]) if g['platform']!=platform]+extra;print(platform,len(extra))
  except Exception as e:
   errors.append(platform+': '+str(e));old=[g for g in previous_catalog if g['platform']==platform]
   if old:data['catalog']=[g for g in data.get('catalog',[]) if g['platform']!=platform]+old
   print('Warning:',errors[-1])
 data['catalogScope']='مختارات رسمية من مناطق AU وUS وUK؛ التوفر يختلف حسب المنطقة والاشتراك. ليست كشفًا شاملًا لحسابك.'
 if not data.get('catalog') or not data.get('news'):raise SystemExit('No valid public data: '+str(errors))
 data['version']=1;data['refreshErrors']=errors;path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
