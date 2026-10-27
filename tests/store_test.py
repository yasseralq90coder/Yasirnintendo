import unittest, importlib.util, json
from pathlib import Path
spec=importlib.util.spec_from_file_location('store',Path(__file__).parents[1]/'tools/refresh-store.py');store=importlib.util.module_from_spec(spec);spec.loader.exec_module(store)
class PublicStore(unittest.TestCase):
 def test_noon_extracts_listing_price_not_unrelated_numbers(self):
  s='<a href="/saudi-en/mario/N123A/p/"><h2 data-qa="plp-product-box-name">Mario - nintendo_switch</h2><strong class="_amount_x">199</strong><span class="_oldPrice_x">259</span></a>'
  r=store.noon(s,'2026-10-27T00:00:00Z');self.assertEqual(r[0]['price'],199);self.assertEqual(r[0]['regular'],259);self.assertEqual(r[0]['currency'],'SAR')
 def test_hardware_is_not_an_offer_for_a_game(self):
  for title in ['Nintendo Switch OLED','Nintendo Switch2 AC Adapter - nintendo_switch','Nintendo Switch 2 Standalone - nintendo_switch']:
   s=f'<a href="/saudi-en/x/N123A/p/"><h2 data-qa="plp-product-box-name">{title}</h2><strong class="_amount_x">199</strong></a>';self.assertEqual(store.noon(s,'now'),[])
 def test_missing_amazon_results_do_not_fabricate_prices(self):self.assertEqual(store.amazon('<html>Service Unavailable</html>','now'),[])
 def test_nintendo_reads_actual_currency_platform_and_deadline(self):
  p={'sortFinalPrice':19.99,'topLevelCategory':{'code':'GAMES'},'name':'A Game','urlKey':'a-game-switch-2','platform':'Nintendo Switch 2','prices':{'finalPrice':19.99,'regularPrice':39.99},'sortdiscountPriceEnd':'2026-11-01T00:00:00Z'}
  data=store.nintendo('<script id="__NEXT_DATA__">'+json.dumps({'p':p})+'</script>','today');self.assertEqual(data[0]['platform'],'Switch 2');self.assertEqual(data[0]['price'],19.99);self.assertEqual(data[0]['endsAt'],'2026-11-01T00:00:00Z')
