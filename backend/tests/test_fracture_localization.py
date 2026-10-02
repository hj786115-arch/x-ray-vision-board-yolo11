import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import numpy as np

os.environ.setdefault('JWT_SECRET', 'test-only-secret-not-for-deployment')
os.environ.setdefault('DISABLE_PRELOAD', 'true')
from app.main import app
from app.services.fracture_model import _normalized_box, _is_fracture_class
from app.routers.analyze import _run_fracture, _is_active_fracture, _run_routed_ensemble

class LocalizationTests(unittest.TestCase):
    def test_non_square_original_coordinates(self):
        self.assertEqual(_normalized_box([100, 200, 300, 600], 500, 1000),
                         {'x':20., 'y':20., 'w':40., 'h':40.})

    def test_clips_to_source_image(self):
        self.assertEqual(_normalized_box([-5,-5,120,220],100,200),
                         {'x':0., 'y':0., 'w':100., 'h':100.})

    def test_rejects_degenerate_and_nonfinite(self):
        for xyxy in ([10,10,5,20],[1,2,1,8],[0,0,float('nan'),2]):
            self.assertIsNone(_normalized_box(xyxy,100,100))

    def test_fracture_class_filter(self):
        for name in ['fracture','Fracture','bone fracture','distal_fracture']:
            self.assertTrue(_is_fracture_class(name))
        for name in ['not fracture','No_Fracture','metal','text','normal','healed fracture','person']:
            self.assertFalse(_is_fracture_class(name))

    def test_placeholder_is_not_an_active_fracture(self):
        self.assertFalse(_is_active_fracture({'name':'No fracture box localized'}))
        self.assertTrue(_is_active_fracture({'name':'Fracture suspected'}))

    def test_bright_image_and_classifier_disagreement_do_not_erase_boxes(self):
        finding={'name':'Fracture suspected','confidence':52.5,'bbox':{'x':20,'y':20,'w':15,'h':10},'model':'YOLO11','severity':'moderate'}
        negative={'name':'No fracture suspected by classifier','confidence':96,'severity':'clear'}
        with patch('app.routers.analyze.get_settings',return_value=SimpleNamespace(fracture_classifier_enabled=True)), \
             patch('app.services.image_preprocess.load_image_from_bytes',return_value=np.full((100,100,3),255,dtype=np.uint8)), \
             patch('app.services.image_preprocess.preprocess_for_vit'), \
             patch('app.services.fracture_model.predict_fractures',return_value=[finding]), \
             patch('app.services.fracture_classifier.predict_fracture_presence',return_value=[negative]):
            result=_run_fracture(b'test',.4)
        self.assertIn(finding,result)
        self.assertIn(negative,result)
        self.assertEqual(sum(bool(f.get('bbox')) for f in result),1)

    def test_classifier_only_never_invents_box(self):
        no_box={'name':'No fracture box localized','confidence':0,'severity':'low'}
        positive={'name':'Fracture suspected','confidence':90,'severity':'high','model':'FractureClassifier'}
        with patch('app.routers.analyze.get_settings',return_value=SimpleNamespace(fracture_classifier_enabled=True)), \
             patch('app.services.image_preprocess.load_image_from_bytes',return_value=np.zeros((100,100,3),dtype=np.uint8)), \
             patch('app.services.image_preprocess.preprocess_for_vit'), \
             patch('app.services.fracture_model.predict_fractures',return_value=[no_box]), \
             patch('app.services.fracture_classifier.predict_fracture_presence',return_value=[positive]):
            result=_run_fracture(b'test',.4)
        self.assertEqual(len(result),2)
        self.assertFalse(any(f.get('bbox') for f in result))

if __name__=='__main__':unittest.main()
