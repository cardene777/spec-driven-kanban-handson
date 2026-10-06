import {describe,it,expect} from 'vitest';
import {isValidAssigneeUserId} from '../../lib/schemas/assignees';
describe('FR-004 userId',()=>{
 it('正常: 文字列IDを許可',()=>{expect(isValidAssigneeUserId('u1')).toBe(true);});
 it('正常: 前後空白除去後のIDを許可',()=>{expect(isValidAssigneeUserId(' u1 ')).toBe(true);});
 it('境界: 空文字を拒否',()=>{expect(isValidAssigneeUserId('')).toBe(false);});
 it('異常: 空白だけを拒否',()=>{expect(isValidAssigneeUserId(' \t\n')).toBe(false);});
 it('異常: 非文字列を拒否',()=>{for(const value of [null,undefined,1,{},[]])expect(isValidAssigneeUserId(value)).toBe(false);});
});

// Section07: 不足する入力クラスのみ追加。保存/状態遷移ではない。
describe('FR-004 /test extension',()=>{
 it('正常: 記号と数字を含むID',()=>{expect(isValidAssigneeUserId('user-123_abc')).toBe(true);});
 it('境界: 1文字と長い文字列（上限未指定）',()=>{expect(isValidAssigneeUserId('a')).toBe(true);expect(isValidAssigneeUserId('x'.repeat(200))).toBe(true);});
 it('異常: 全角スペースのみ',()=>{expect(isValidAssigneeUserId('　')).toBe(false);});
 it('異常: boolean/bigint/symbol/function',()=>{for(const value of [true,BigInt(10),Symbol('id'),()=> 'id'])expect(isValidAssigneeUserId(value)).toBe(false);});
});
