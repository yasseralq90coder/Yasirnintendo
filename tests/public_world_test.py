import unittest,importlib.util,pathlib
spec=importlib.util.spec_from_file_location('refresh_world',pathlib.Path(__file__).resolve().parents[1]/'tools'/'refresh-world.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PublicSources(unittest.TestCase):
 def test_react_stream_keeps_correct_platform(self):
  def cards(prefix,n):return ''.join('<div class="generic-card"><img alt="'+prefix+str(i)+'" src="https://assets.nintendo.com.au/'+str(i)+'.jpg"></div>' for i in range(n))
  h='<div id="nes-content">'+cards('NES',12)+'</div><div id="snes-content"><template id="B:15"></template></div><div hidden id="S:15">'+cards('SNES',8)+'</div><script>$RC("B:15","S:15")</script>'
  rows=m.catalogue(h,'2026-10-26');self.assertEqual(sum(r['platform']=='SNES' for r in rows),8);self.assertEqual(len(rows),20)
 def test_genesis_title_list_has_stable_identity(self):
  h='<h2>Included games:</h2><ul><li>A</li><li>B</li><li>C</li></ul>';a=m.extra_catalogue(h,'SEGA Genesis','https://www.nintendo.com/example','US','2026-10-26');b=m.extra_catalogue(h,'SEGA Genesis','https://www.nintendo.com/example','US','2026-10-27');self.assertEqual(a[0]['id'],b[0]['id']);self.assertEqual(len(a),3)
 def test_virtualboy_uses_original_image_instead_of_lazy_placeholder(self):
  h='<div class="teaser-carousel-virtualboy">'+''.join('<li data-nt-item-title="Game '+str(i)+'"><img src="grey.gif" data-xs="https://www.nintendo.com/game'+str(i)+'.jpg"></li>' for i in range(3))+'</div>';rows=m.extra_catalogue(h,'Virtual Boy','https://www.nintendo.com/example','UK','2026-10-26');self.assertTrue(rows[0]['cover'].endswith('game0.jpg'))
 def test_news_rejects_future_dates_and_duplicate_urls(self):
  def item(i,date):return '<a href="/us/whatsnew/game-'+str(i)+'/" aria-label="Headline '+str(i)+'"><p>'+date+'</p></a>'
  rows=m.news(''.join(item(i,'10/26/26') for i in range(3))+item(1,'10/26/26')+item(9,'01/01/99'),'2026-10-26');self.assertEqual(len(rows),3);self.assertTrue(all(r['date']=='2026-10-26' for r in rows))
if __name__=='__main__':unittest.main()
