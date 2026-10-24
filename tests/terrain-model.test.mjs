import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_AREA, CELL_SIZE, GRID_CELLS, WORLD_HALF,
  cellIndexAt, isEdgeCell, makeTerrainCells, terrainHeight,
} from '../src/terrain-model.ts';

test('heightfield is one fixed 10x10m surface with level edges',()=>{
  for(let x=-5;x<=5;x+=.25){
    assert.ok(Math.abs(terrainHeight(x,5)) < 1e-9);
    assert.ok(Math.abs(terrainHeight(x,-5)) < 1e-9);
    assert.ok(Math.abs(terrainHeight(5,x)) < 1e-9);
    assert.ok(Math.abs(terrainHeight(-5,x)) < 1e-9);
  }
  assert.ok(terrainHeight(-2.75,-2.35) < -.07);
  assert.ok(terrainHeight(.75,2.3) < -.08);
  assert.ok(terrainHeight(1.25,-.45) > terrainHeight(.75,2.3));
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
