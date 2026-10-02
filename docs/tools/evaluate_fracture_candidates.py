import os,json,pathlib,gc,time
os.environ['OMP_NUM_THREADS']='2';os.environ['MKL_NUM_THREADS']='2'
import torch,cv2
torch.set_num_threads(2)
from ultralytics import YOLO
ROOT=pathlib.Path(__file__).resolve().parents[2];DIR=ROOT/'review.local/model-comparison'

def iou(a,b):
 overlap=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]));union=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-overlap;return overlap/union if union else 0
models=[ROOT/'backend/models/fracture_yolo11.onnx']+[f for f in sorted(DIR.glob('*.pt')) if 'lewis' not in f.name]
for path in models:
 try:
  if path.suffix=='.pt':
   unsafe=torch.serialization.get_unsafe_globals_in_checkpoint(path)
   unknown=[x for x in unsafe if not x.startswith(('torch.nn.','ultralytics.nn.','ultralytics.utils.loss.','ultralytics.utils.tal.','ultralytics.utils.IterableSimpleNamespace','collections.','builtins.','torch._utils.','numpy.'))]
   if unknown:print('SKIP',path.name,unknown,flush=True);continue
  model=YOLO(str(path),task='detect');print('MODEL',path.name,model.names,flush=True)
  classes=[k for k,v in model.names.items() if 'fracture' in str(v).lower() and 'no' not in str(v).lower()];records=[]
  if not classes:continue
  for p in sorted((DIR/'fracatlas-eval').glob('*.png')):
   im=cv2.imread(str(p));h,w=im.shape[:2];data=json.loads(p.with_suffix('.json').read_text());gt=[[b[0]*w,b[1]*h,b[2]*w,b[3]*h] for label,b in zip(data['objects']['label'],data['objects']['box']) if label in ('fracture','fractured')]
   pred=model(im,conf=.1,iou=.45,imgsz=640,classes=classes,device='cpu',verbose=False)[0]
   records.append({'sample':p.name,'truth':gt,'predictions':[{'box':b.xyxy[0].tolist(),'confidence':float(b.conf[0])} for b in pred.boxes]})
  summary=[]
  for threshold in [.25,.4,.5,.6]:
   for overlap in [.3,.5]:
    tp=fp=fn=ni=nfp=pi=lp=0
    for rec in records:
     bs=[b['box'] for b in rec['predictions'] if b['confidence']>=threshold];gt=rec['truth'];used=set();matched=0
     for g in gt:
      best=max(((iou(g,b),i) for i,b in enumerate(bs) if i not in used),default=(0,-1))
      if best[0]>=overlap:matched+=1;used.add(best[1])
     tp+=matched;fn+=len(gt)-matched;fp+=len(bs)-matched;pi+=bool(gt);lp+=matched>0;ni+=not bool(gt);nfp+=(not gt and bool(bs))
    summary.append(dict(threshold=threshold,iou=overlap,tp=tp,fp=fp,fn=fn,negative_images=ni,negative_images_with_box=nfp,positive_images=pi,localized_positive_images=lp))
  print('RESULT',path.name,json.dumps([x for x in summary if x['threshold']==.4]),flush=True);(DIR/(path.stem+'-fracatlas-eval.json')).write_text(json.dumps(dict(model=path.name,summary=summary,records=records),indent=2));del model;gc.collect()
 except Exception as e:print('ERROR',path.name,type(e).__name__,str(e)[:300],flush=True)
