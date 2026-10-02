import os
os.environ.setdefault('JWT_SECRET', 'test-only-not-production')
os.environ.setdefault('DISABLE_PRELOAD', 'true')
import unittest
from unittest.mock import patch
import torch
from app.services.fracture_assessment import fracture_assessment
from app.services.openrouter_agent import synthesize_report
from app.services.image_router import route_from_logits

class EvidenceAssessmentTests(unittest.TestCase):
    def test_99_percent_classifier_is_not_confirmed_or_minor(self):
        f={'name':'Unconfirmed fracture signal (image classifier)','model':'FractureClassifier','confidence':99.1}
        result=fracture_assessment([f])
        self.assertEqual(result['urgency'],'review')
        self.assertIn('missed or subtle fracture',result['synthesis_text'])

    def test_negative_classifier_does_not_cancel_localized_fracture(self):
        findings=[{'name':'Fracture suspected','confidence':41,'bbox':{'x':10,'y':20,'w':15,'h':12}}, {'name':'No fracture suspected by classifier','model':'FractureClassifier','confidence':99}]
        report=fracture_assessment(findings)
        self.assertEqual(report['urgency'],'high')
        self.assertIn('does not cancel',report['synthesis_text'])

    def test_missing_box_never_means_safe(self):
        for findings in [[],[{'name':'No fracture box localized','confidence':0}],[{'name':'No fracture suspected by classifier','confidence':99,'model':'FractureClassifier'}]]:
            self.assertEqual(fracture_assessment(findings)['urgency'],'review')

    def test_language_model_cannot_override_fracture_evidence(self):
        with patch('app.services.openrouter_agent.complete_text') as remote:
            self.assertEqual(synthesize_report([], 'fracture')['urgency'],'review')
            remote.assert_not_called()

    def test_explicit_negative_agreement_is_reported_without_claiming_normal(self):
        negative = {'name': 'No fracture suspected by classifier', 'model': 'FractureClassifier', 'confidence': 90}
        for model in ('YOLOv8-MultiRegion', 'YOLO26-Wrist'):
            findings = [{'name': 'No fracture box localized', 'model': model}, negative]
            with patch('app.services.openrouter_agent.complete_text') as remote:
                result = synthesize_report(findings, 'fracture')
                remote.assert_not_called()
            self.assertEqual(result['urgency'], 'clear')
            self.assertTrue(result['synthesis_text'].startswith('No fracture detected by AI.'))
            self.assertIn('AI can miss subtle fractures', result['synthesis_text'])
            self.assertFalse(any(f.get('bbox') for f in findings))

    def test_disagreement_unknown_or_missing_evidence_stays_review(self):
        detector = {'name': 'No fracture box localized', 'model': 'YOLOv8-MultiRegion'}
        positive = {'name': 'Unconfirmed fracture signal (image classifier)', 'model': 'FractureClassifier', 'confidence': 99}
        negative = {'name': 'No fracture suspected by classifier', 'model': 'FractureClassifier', 'confidence': 99}
        unknown = {'name': 'Unknown', 'model': 'FractureClassifier'}
        for findings in ([detector, positive], [detector, positive, negative], [detector, unknown], [detector], [negative], [{'name': 'No fracture box localized', 'model': 'Unavailable'}, negative]):
            self.assertEqual(fracture_assessment(findings)['urgency'], 'review')

    def test_other_scan_types_keep_their_synthesis_path(self):
        for scan_type in ('chest', 'wound'):
            with patch('app.services.openrouter_agent.complete_text', return_value='{"urgency":"medium","synthesis_text":"Existing report","recommended_actions":[],"specialist":null}') as remote:
                result = synthesize_report([], scan_type)
                remote.assert_called_once()
                self.assertEqual(result['urgency'], 'medium')
                self.assertEqual(result['synthesis_text'], 'Existing report')

    def test_router_uses_image_type_and_abstains_on_ties(self):
        self.assertTrue(route_from_logits(torch.ones(10))['ambiguous'])
        for index,expected in [(0,'fracture'),(6,'chest'),(7,'wound')]:
            logits=torch.zeros(10);logits[index]=10
            result=route_from_logits(logits)
            self.assertEqual(result['scan_type'],expected)
            self.assertFalse(result['ambiguous'])
        logits=torch.zeros(10);logits[9]=10
        self.assertTrue(route_from_logits(logits)['ambiguous'])

if __name__=='__main__': unittest.main()
