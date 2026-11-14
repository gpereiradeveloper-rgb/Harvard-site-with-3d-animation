import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScrollSeekDriver} from '../src/ScrollSeek.mjs';

function source() {
  let time=10, clock=0, state=2, pauses=0;
  const seeks=[];
  const driver=createScrollSeekDriver({
    start:10,end:20,readTime:()=>time,readState:()=>state,
    now:()=>clock,seek:t=>seeks.push(t),pause:()=>{pauses++;state=2;},
  });
  return {driver,seeks,get pauses(){return pauses;},ack:t=>{time=t;},advance:ms=>{clock+=ms;},play:()=>{state=1;}};
}

test('idle scroll holds its frame and stops independent playback',()=>{
  const s=source();
  s.driver.tick(.425,true);s.advance(1000);s.driver.tick(.425,true);
  assert.deepEqual(s.seeks,[]);
  s.play();s.driver.tick(.425,true);assert.equal(s.pauses,1);
});

test('a seek acknowledged while already paused immediately admits the next destination',()=>{
  const s=source();
  s.driver.tick(.60,true);const first=s.seeks[0];
  s.advance(50);s.driver.tick(.70,true);assert.equal(s.seeks.length,1);
  s.ack(first);s.advance(50);s.driver.tick(.70,true);
  assert.equal(s.seeks.length,2);assert.ok(s.seeks[1]>first);
});

test('a stalled seek coalesces intervening input into the latest target',()=>{
  const s=source();
  s.driver.tick(.55,true);s.advance(100);s.driver.tick(.65,true);
  s.advance(100);s.driver.tick(.75,true);assert.equal(s.seeks.length,1);
  s.advance(201);s.driver.tick(.85,true);assert.deepEqual(s.seeks.slice(1),[20]);
});

test('reverse scroll seeks backwards and inactive chapters never seek',()=>{
  const s=source();s.ack(18);
  s.driver.tick(.45,true);assert.ok(s.seeks[0]<18);
  s.ack(s.seeks[0]);s.advance(1000);s.driver.tick(.80,false);
  assert.equal(s.seeks.length,1);
});
