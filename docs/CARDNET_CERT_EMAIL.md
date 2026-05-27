# Email a Hansel — Solicitud de certificación CARDNET

Listo para enviar. Copiar/pegar al cliente de correo, ajustar saludo / cc según necesidad.

---

**Para:** Hansel Aybar — Integraciones CARDNET
**CC:** (ejecutivo comercial Kibay, si aplica)
**Asunto:** Kibay (kibay.com.do) — Integración Botón de Pago lista; solicitamos slot de certificación

---

Hola Hansel, buenos días.

Gracias por las aclaraciones del 27 de mayo — quedamos completamente alineados en que estamos integrando **Botón de Pago (Webpantalla)** y no ZTRANS Web Services. Ya implementamos la integración del lado de Kibay y la probamos end-to-end contra el ambiente QA.

## Lo que tenemos funcionando en QA

Usando los datos del ambiente QA que nos compartiste:
- `MerchantNumber: 349000000`
- `MerchantTerminal: 58585858`
- `MerchantType: 7997`
- URL base: `https://labservicios.cardnet.com.do/sessions` y `/authorize`
- Tarjetas de prueba Visa `4761340000000050` y MasterCard `5461340000000050`

Validamos lo siguiente:

1. **Creación de sesión** — `POST /sessions` con los campos requeridos (incluyendo todos los `3DS_*` mandatorios: email, mobilePhone, workPhone, homePhone, billAddr_line1/2/3, city, state, country, postCode). CARDNET responde con `SESSION` + `session-key`. ✅
2. **Redirección al gateway** — el navegador hace form-POST a `/authorize` con el SESSION; aterriza correctamente en la página alojada de CARDNET (`labservicios.cardnet.com.do/auth?s=...`) mostrando el monto en RD$, ITBIS calculado, datos del cliente prellenados, y los logos de Visa Secure / MC ID Check / SafeKey. ✅
3. **Verificación post-pago** — `GET /sessions/<SESSION>?sk=<key>` desde el backend. Implementado y desplegado. ⏳ (pendiente de probar el ciclo completo con OTP 3DS — eso es exactamente lo que esperamos validar contigo durante la certificación).
4. **URL de retorno y cancelación** — configuradas a `https://kibay.com.do/checkout/cardnet/return` y `/cancel`. El flujo de cancelación ya quedó probado (CARDNET nos redirige correctamente cuando el flujo no se completa).

## Arquitectura — del lado de Kibay

- Frontend: SPA en React (Vite) servido desde Cloudflare Pages.
- Backend: Supabase Edge Functions (Deno) para los dos endpoints que tocan CARDNET — uno para crear sesión, otro para verificar el resultado.
- Datos de tarjeta: **nunca tocan nuestros servidores**. Solo se introducen en tu página alojada → alcance PCI SAQ A.
- Datos persistidos del lado nuestro: SESSION GUID, session-key (cifrada en reposo en Supabase), AuthorizationCode, RetrievalReferenceNumber, ResponseCode, TxToken — todo lo necesario para soporte al cliente y reconciliación, nada de PAN.

## Lo que necesitamos de ustedes

1. **Slot de certificación** — confirmar fecha/hora cuando podemos correr los escenarios de prueba juntos (idealmente esta semana o la próxima). Estamos disponibles en horario AST.

2. **Lista de escenarios** — ¿pueden compartir el checklist que cubrimos en la certificación? Asumimos:
   - Compra normal aprobada
   - Compra rechazada (declinada por el emisor)
   - Compra con 3DS challenge completada exitosamente (con OTP)
   - Compra con 3DS challenge fallida (cancelación o timeout)
   - Sesión expirada (intentar verificar después de los 30 minutos)
   - Reverso/anulación (`TransactionType: 2240`) — si aplica para Webpantalla
   
   Si hay otros, agradecemos saber por adelantado para tenerlos cubiertos.

3. **Producción** — una vez completada la certificación, esperamos recibir:
   - `MerchantNumber` y `MerchantTerminal` productivos para Kibay
   - URLs productivas (asumimos `https://ecommerce.cardnet.com.do/sessions` y `/authorize`)
   - `MerchantType` que aplica para nuestra industria (vinos/licores — sugerimos 5921 si está disponible)

4. **Whitelist de URL de integración** — apenas tengamos credenciales productivas, le enviaremos al ejecutivo comercial el dominio `https://kibay.com.do` para que lo añada al whitelist como nos indicaste.

## Datos del afiliado

- **Comercio:** kibay.com.do (marca: Kibay)
- **Razón social:** LADISON DOMINICANA SRL
- **RNC:** 131128033
- **Licencia DGII:** VINO-022 — Licencia de Fabricación de Vinos (emitida 17/06/2023, VIGENTE)
- **Dirección:** Bahía de Ocoa, Km 6½ Hatillo, Azua 71003, República Dominicana
- **Ambiente actual:** QA contra `labservicios.cardnet.com.do`
- **Tarjetas probadas:** las que nos compartiste (Visa 4761... y MC 5461...)

Quedamos atentos para coordinar el slot de certificación. Si necesitas más datos del lado técnico o un diagrama del flujo, lo enviamos con gusto.

Saludos cordiales,
Michał Babula
Kibay
kibay.com.do

---

## Notas internas

- No mencionar el rewriting del backend ni que pasamos de ZTRANS a Botón de Pago — Hansel ya nos aclaró y no necesita el histórico.
- Si Hansel pide capturas: tenemos screenshots del flujo (página alojada con el monto correcto, ITBIS, etc.) en `/tmp/cardnet-full-e2e/` después de la última corrida E2E. Adjuntables al correo si lo solicita.
- Datos del afiliado completos: LADISON DOMINICANA SRL · RNC 131128033 · Licencia VINO-022. Estos también están en el módulo `src/lib/legalEntity.js` como única fuente de verdad y ya están aplicados en CARDNET (`CARDNET_MERCHANT_NAME` secret), en el footer de los correos transaccionales, y en el PDF de factura.
