import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_AREA, CELL_SIZE, GRID_CELLS, WORLD_HALF,
  cellIndexAt, isEdgeCell, makeTerrainCells, terrainHeight,
} from '../src/terrain-model.ts';

test('10x10 metre test section is a north-south falling valley with side ridges',()=>{
  // -Z is North, +Z is South. No flat boundary is expected anymore.
  for(const x of [-4,-2,0,2,4]){
    assert.ok(terrainHeight(x,-4.7)>terrainHeight(x,4.7),
      'north land must sit above south for fixed x='+x);
  }
  for(let z=-4;z<=4;z+=1){
    const center=terrainHeight(0,z);
    assert.ok(terrainHeight(-4.75,z)>center+.08);
    assert.ok(terrainHeight(4.75,z)>center+.08);
  }
  assert.ok(terrainHeight(-2.85,-.93)<terrainHeight(-2.85,-2));
  assert.ok(terrainHeight(2.45,1.15)<terrainHeight(2.45,0));
});
test('hydrology and renderer use same terrain coordinates and cell heights',()=>{
  const cells=makeTerrainCells();
  assert.equal(cells.length, GRID_CELLS**2);
  assert.ok(Math.abs(CELL_AREA*cells.length - 100)<1e-9);
  for(const cell of cells){
    assert.equal(cell.index,cellIndexAt(cell.x,cell.z));
    assert.ok(Math.abs(terrainHeight(cell.x,cell.z)-cell.height)<1e-12);
    assert.ok(Math.abs(cell.x)<WORLD_HALF && Math.abs(cell.z)<WORLD_HALF);
    assert.ok(cell.neighbors.every(n=>n>=0&&n<cells.length&&n!==cell.index));
    assert.ok(cell.neighbors.length>=3&&cell.neighbors.length<=8);
  }
  assert.equal(isEdgeCell(0),true);
  assert.equal(isEdgeCell(GRID_CELLS+1),false);
  assert.equal(CELL_SIZE,10/GRID_CELLS);
});
