import {describe,it,expect} from 'vitest';
import {MAX_ASSIGNEES,canAddAssignee} from '../../lib/assignees/limit';
describe('FR-005 count boundary',()=>{
 it('境界: 0人は許可',()=>{expect(canAddAssignee(0)).toBe(true);});
 it('境界: 9人は許可',()=>{expect(MAX_ASSIGNEES).toBe(10);expect(canAddAssignee(9)).toBe(true);});
 it('境界: 10人は拒否',()=>{expect(canAddAssignee(10)).toBe(false);});
 it('境界: 11人は拒否',()=>{expect(canAddAssignee(11)).toBe(false);});
 it('異常: 負数と非整数を拒否',()=>{expect(canAddAssignee(-1)).toBe(false);expect(canAddAssignee(1.5)).toBe(false);});
});

// Section07: 人数入力の境界であり、保存や追加/削除の状態変化ではない。
describe('FR-005 /test extension',()=>{
 it('正常: 上限未満の中間人数',()=>{for(const count of [1,5,8])expect(canAddAssignee(count)).toBe(true);});
 it('異常: 非有限数値',()=>{for(const count of [NaN,Infinity,-Infinity])expect(canAddAssignee(count)).toBe(false);});
 it('異常: 上限直前の非整数',()=>{expect(canAddAssignee(9.9)).toBe(false);});
});
