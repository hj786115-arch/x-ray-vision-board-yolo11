import test from 'node:test';
import assert from 'node:assert/strict';
import {selectBoxFindings} from '../src/lib/fracture-boxes.ts';
const f=(name,confidence,bbox={x:20,y:30,w:10,h:20})=>({name,confidence,bbox,color:'warning',severity:'moderate',model:'YOLO11'});
test('all fractures remain visible when hardware has higher confidence',()=>{
 const a=f('Fracture suspected',52.5),b=f('Fracture Detected',71);
 assert.deepEqual(selectBoxFindings([f('Metallic Implant',99),a,b],'fracture'),[a,b]);
});
test('invalid, missing, or off-image boxes are rejected',()=>{
 assert.deepEqual(selectBoxFindings([f('No fracture box localized',0,null),f('Fracture suspected',88,{x:0,y:0,w:NaN,h:10}),f('Fracture suspected',88,{x:95,y:0,w:10,h:10})],'fracture'),[]);
});
test('non-fracture routes retain the original highest-confidence single box',()=>{
 const metal=f('Metallic Implant',99),other=f('Other finding',80);
 for(const type of ['chest','wound'])assert.deepEqual(selectBoxFindings([other,metal],type),[metal]);
});
