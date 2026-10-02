import os
os.environ.setdefault('JWT_SECRET', 'test-only-not-production')
os.environ.setdefault('DISABLE_PRELOAD', 'true')
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from app.services.chatbot_service import chat_with_health_bot
from app.services.openrouter_client import OpenRouterError
from app.services.basic_health_guidance import basic_health_guidance
from app.routers import clinics


class ChatFallbackTests(unittest.TestCase):
    def test_missing_provider_is_explicit_limited_guidance(self):
        with patch('app.services.chatbot_service.complete_chat', side_effect=OpenRouterError('No key', 'Not configured')):
            r=chat_with_health_bot('I have a mild headache')
        self.assertTrue(r['ok'])
        self.assertEqual(r['mode'],'basic_guidance')
        self.assertIn('prewritten',r['notice'])
        self.assertTrue(r['sources'][0].startswith('https://www.nhs.uk/'))

    def test_online_assistant_is_preserved(self):
        with patch('app.services.chatbot_service.complete_chat', return_value='Hello.\nDOCTOR_TYPE: none\nHOME_REMEDIES: none'):
            r=chat_with_health_bot('Hello')
        self.assertEqual(r['mode'],'online_ai')
        self.assertEqual(r['reply'],'Hello.')

    def test_urgent_symptoms_override_routine_topic(self):
        r=basic_health_guidance('I have a fever and cannot breathe')
        self.assertEqual(r['doctor_type'],'Emergency Department')
        self.assertIn('now',r['reply'])

    def test_no_drug_dose_or_personalized_child_treatment(self):
        self.assertIn('cannot choose a medicine or dose',basic_health_guidance('Which antibiotic dose for fever?')['reply'])
        self.assertIn('individual assessment',basic_health_guidance('My baby has a fever')['reply'])


class ClinicTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self): clinics._cache.clear()

    def test_missing_coordinates_are_not_fabricated(self):
        self.assertEqual(clinics._parse_clinics([{'tags':{'name':'Unknown hospital','amenity':'hospital'}}],31.52,74.35,5),[])

    def test_exact_distance_filter_and_deduplication(self):
        near={'type':'node','lat':31.52,'lon':74.35,'tags':{'name':'Test clinic','amenity':'clinic'}}
        far={**near,'lat':32.5,'tags':{'name':'Far clinic','amenity':'clinic'}}
        result=clinics._parse_clinics([far,near,near],31.52,74.35,5)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0].name,'Test clinic')
        self.assertEqual(result[0].distance_km,0)

    async def test_partial_upstream_reply_is_not_empty_success(self):
        response=MagicMock()
        response.json.side_effect=[{'remark':'runtime error: timed out','elements':[]},{'elements':[]}]
        client=MagicMock();client.post=AsyncMock(return_value=response)
        cm=MagicMock();cm.__aenter__=AsyncMock(return_value=client);cm.__aexit__=AsyncMock(return_value=False)
        with patch('app.routers.clinics.httpx.AsyncClient',return_value=cm):
            self.assertEqual(await clinics._fetch_overpass_elements(31.52,74.35,5000),[])
            self.assertEqual(client.post.await_count,2)
            await clinics._fetch_overpass_elements(31.52,74.35,5000)
            self.assertEqual(client.post.await_count,2)

    async def test_city_results_preserve_country_and_coordinates(self):
        r=MagicMock();r.json.return_value={'results':[{'name':'Lahore','country':'Pakistan','latitude':31.558,'longitude':74.35071}]}
        c=MagicMock();c.get=AsyncMock(return_value=r)
        cm=MagicMock();cm.__aenter__=AsyncMock(return_value=c);cm.__aexit__=AsyncMock(return_value=False)
        with patch('app.routers.clinics.httpx.AsyncClient',return_value=cm):
            result=await clinics.search_clinic_locations('Lahore','test-user')
        self.assertEqual(result['locations'][0],{'name':'Lahore, Pakistan','lat':31.558,'lon':74.35071})

if __name__=='__main__': unittest.main()
