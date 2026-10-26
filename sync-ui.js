const messages={
 nintendo_auth_required:'رفضت Nintendo تفويض الوصول. أعد ربط الحساب ثم حدّث البيانات.',
 nintendo_rate_limited:'طلبت Nintendo تقليل الطلبات. احتُفظ بآخر بيانات؛ حاول لاحقًا.',
 wait_one_minute:'انتظر دقيقة بين محاولات التحديث.',
 sync_in_progress:'المزامنة جارية بالفعل؛ يمكنك متابعة تقدمها هنا.',
 unsupported_platforms:'وصلت قائمة، لكن رموز منصاتها غير مدعومة. أرسل رموز المنصات الظاهرة أدناه.',
 unexpected_empty_history:'أعادت Nintendo قائمة فارغة غير متوقعة؛ احتفظنا بآخر بياناتك.',
 no_supported_titles_returned:'لم ترجع ألعاب Switch المدعومة؛ احتُفظ بآخر بياناتك.',
 no_successful_sync:'تم الربط، لكن لم ينجح جلب قائمة الألعاب بعد. اضغط تحديث الآن وتابع الحالة.',
 network_timeout:'انتهت مهلة الاتصال مع Nintendo. جرّب شبكة أخرى ثم حدّث.',
 network_unavailable:'تعذر الوصول إلى Nintendo. تحقق من اتصال الإنترنت.',
 network_tls_error:'تعذر تأمين الاتصال مع Nintendo. تحقق من تاريخ الجهاز والشبكة.',
 invalid_history_response:'شكل استجابة Nintendo غير متوقع؛ لم نحذف بياناتك السابقة.',
 invalid_daily_history:'تفاصيل الأيام غير متوافقة؛ إجمالي اللعبة محفوظ دون تقدير أيام مفقودة.',
 secure_storage_unavailable:'تعذر فتح التخزين المشفّر في الجهاز. لا تحذف التطبيق؛ احفظ Backup أولًا.',
 nintendo_operation_failed:'تعذر إكمال طلب Nintendo. أرسل صورة لحالة الربط لتشخيصه.',
 snapshot_import_failed:'وصلت بيانات Nintendo لكن تعذر إدخالها إلى المكتبة.',
};
export function syncError(code){if(messages[code])return messages[code];if(/^nintendo_http_\d{3}$/.test(code))return 'أعاد خادم Nintendo خطأ HTTP '+code.slice(-3)+'؛ احتُفظ بآخر بياناتك.';return String(code||'تعذّر إكمال المزامنة.');}
export function syncStatusText(d){
 const stages={idle:'جاهز',list:'جلب قائمة الألعاب',days:'جلب تفاصيل الأيام',complete:'اكتمل الجلب',failed:'فشل الجلب'};
 let text=(d.linked?'الحساب مربوط':'الحساب غير مربوط')+' · '+(d.syncing?(stages[d.phase]||'المزامنة جارية'):(d.lastError?syncError(d.lastError):stages[d.phase]||'جاهز'));
 text+=' · '+Number(d.titles||0)+' لعبة';
 if(d.syncing&&d.progressTotal)text+=' · تفاصيل '+Number(d.progressDone||0)+' / '+Number(d.progressTotal);
 if(d.dailyFailed)text+=' · تعذر تاريخ '+Number(d.dailyFailed)+' لعبة ('+syncError(d.dailyError)+')؛ الإجماليات محفوظة';
 if(d.platforms)text+=' · المنصات: '+d.platforms;
 text+=' · آخر قائمة ناجحة: '+(d.syncedAt||'لم تصل بعد');
 return text;
}
