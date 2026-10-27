package com.yasir.nintendo;
import org.junit.Test;
import org.json.JSONObject;
import java.time.Instant;
import static org.junit.Assert.*;
public class DealAlertTest {
 @Test public void priceAlertsRequireMatchingCurrencyFreshnessAndTarget() throws Exception {
  long now=Instant.parse("2026-10-27T12:00:00Z").toEpochMilli();JSONObject o=new JSONObject("{\"id\":\"a\",\"price\":20,\"currency\":\"USD\",\"checkedAt\":\"2026-10-27T11:00:00Z\",\"endsAt\":\"2026-10-29T00:00:00Z\"}");JSONObject w=new JSONObject("{\"id\":\"a\",\"target\":25,\"currency\":\"USD\"}");assertTrue(DealAlertService.qualifies(o,w,now));w.put("currency","SAR");assertFalse(DealAlertService.qualifies(o,w,now));w.put("currency","USD");o.put("checkedAt","2026-10-25T00:00:00Z");assertFalse(DealAlertService.qualifies(o,w,now));o.put("checkedAt","2026-10-27T11:00:00Z");o.put("endsAt","2026-10-26T00:00:00Z");assertFalse(DealAlertService.qualifies(o,w,now));
 }
}
