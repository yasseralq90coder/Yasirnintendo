import test from 'node:test';
import assert from 'node:assert/strict';
import {syncError,syncStatusText} from '../sync-ui.js';
test('sync status distinguishes linked account, downloading and completed totals',()=>{
 const text=syncStatusText({linked:true,syncing:true,phase:'days',titles:14,progressDone:3,progressTotal:14});
 assert.ok(text.includes('جلب تفاصيل الأيام'));assert.ok(text.includes('3 / 14'));assert.ok(text.includes('14 لعبة'));
});
test('daily failure is visible without incorrectly reporting no games',()=>{
 const text=syncStatusText({linked:true,titles:14,phase:'complete',dailyFailed:1,dailyError:'nintendo_http_404'});assert.ok(text.includes('14 لعبة'));assert.ok(text.includes('404'));assert.ok(text.includes('الإجماليات محفوظة'));
});
test('HTTP and source schema failures have actionable visible descriptions',()=>{assert.ok(syncError('nintendo_http_401').includes('401'));assert.ok(syncError('invalid_history_response').includes('شكل استجابة'));});
