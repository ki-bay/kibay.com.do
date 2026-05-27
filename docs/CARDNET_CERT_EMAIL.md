# Email a Hansel — Solicitud de certificación CARDNET

Listo para enviar. Tono natural, corto, solo lo accionable.

---

**Para:** Hansel Aybar — Integraciones CARDNET
**Asunto:** Kibay — listos para certificar Botón de Pago

---

Hola Hansel, buenas.

Ya tenemos la integración de Botón de Pago corriendo contra QA (`labservicios.cardnet.com.do`) con los datos de prueba que nos compartieron. Llegamos hasta la página alojada con el monto correcto, ITBIS, 3DS, etc. — lo único que no pude probar solo es el ciclo completo con OTP, así que de ahí en adelante es lo que necesitamos validar contigo.

**¿Cuándo podríamos agendar la certificación?** Esta semana o la próxima nos va bien, en horario AST.

Si me puedes adelantar la lista de escenarios que cubrimos en la sesión, los preparo de antemano. Asumo que van: aprobada, rechazada, 3DS OK, 3DS fallido, sesión expirada, y reverso si aplica — pero confirmame si me falta alguno.

Datos del afiliado para que lo encuentres rápido:

- **Razón social:** LADISON DOMINICANA SRL
- **RNC:** 131128033
- **Licencia DGII:** VINO-022 (Fabricación de Vinos, emitida 17/06/2023)
- **Comercio web:** kibay.com.do

Gracias,
Michał

---

## Notas internas (no enviar)

- Mantener el correo corto. Lo único que Hansel necesita decidir es la fecha de certificación; el resto es contexto.
- Si pide más detalles técnicos: tenemos screenshots de la página alojada con el monto correcto en `/tmp/cardnet-full-e2e/` y `/tmp/cardnet-boton-e2e/`. Adjuntables si los pide.
- Tras la certificación pedimos: MerchantNumber + MerchantTerminal productivos, URLs productivas (`ecommerce.cardnet.com.do`), MerchantType para vinos (5921). NO ponerlo en este correo — es ruido para el ask actual.
- Whitelist de `kibay.com.do` se hace después, vía ejecutivo comercial.
- Datos del afiliado también están en `src/lib/legalEntity.js` y aplicados en CARDNET_MERCHANT_NAME, emails y facturas PDF.
