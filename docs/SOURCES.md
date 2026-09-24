# Source strategy and example audit

Manual example review date: **24 September 2026**. Publication dates are left unknown unless explicitly supported by the source. A review timestamp is not a publication date or proof that contact information will remain current.

| Source                                                                                                                                                                        | Supported use                                                                              | Limitation                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Compras MX](https://comprasmx.buengobierno.gob.mx/sitiopublico/) and [datasets](https://comprasmx.buengobierno.gob.mx/datos-abiertos)                                        | Federal procedure discovery, historical purchasing context; portal includes 2026 downloads | No documented public API was verified. Contracts do not imply an open opportunity.     |
| [Nuevo León convocatorias](https://www.nl.gob.mx/es/licitaciones-dependencias-centrales)                                                                                      | Initial state procurement coverage                                                         | No nationwide completeness claim.                                                      |
| [INEGI DENUE API](https://www.inegi.org.mx/servicios/api_denue.html)                                                                                                          | Establishments, activity, geography and available business contact fields                  | Requires server-side token; not an individual-physician or buyer database.             |
| [Doctoralia terms](https://www.doctoralia.com.mx/terminos-y-condiciones)                                                                                                      | External discovery/reference link only                                                     | Section 9 restricts extraction/reuse without authorization; no bulk profile ingestion. |
| [CONACEM](https://www.conacem.org.mx/q-a), [SEP registry information](https://sep.puebla.gob.mx/index.php/estudiantes/educacion-superior/registro-nacional-de-profesionistas) | Independent credential verification                                                        | Not sales-contact databases. Examples do not claim verified credentials.               |

## Monitoring example

[IMSS award document, Mérida, 2025](https://reposipot.imss.gob.mx/unidad_trans/UMAE_ESP_YUC/2025/LA-50-GYR-050GYR063-N-46-2025/FALLO.pdf): procedure LA-50-GYR-050GYR063-N-46-2025; preventive/corrective maintenance of 35 Medica D monitors, Logicare and Vitacare models. The disqualification discussion supports the importance of manufacturer/authorized-distributor support. This is a historical maintenance record outside the sample's Monterrey territory, not a new-equipment lead or a current invitation to bid. Supplier ability to meet the requirement is unknown.

[CHRISTUS MUGUERZA Hospital Alta Especialidad](https://www.christusmuguerza.com.mx/hospital-alta-especialidad): official page lists the Monterrey location, emergency medical services and general telephone **81 8399 3477**. The sample labels this as a general switchboard, not a purchasing extension. A potential monitoring discussion is an explicitly labeled commercial hypothesis. No active purchase, budget, installed system, biomedical-engineering contact or named purchaser is claimed.

## Procedure-focused example

[Dr. Jorge Alberto Pérez Samperio](https://hospitalangeles.com/medico/jorge-alberto-perez-samperio): official Hospital Angeles profile supports general surgery, minimally invasive surgery and Hospital Angeles México affiliation.

[Dr. Mauricio Rodríguez González](https://hospitalangeles.com/medico/mauricio-rodriguez-gonzalez): official profile supports general surgery, advanced laparoscopic surgery and Hospital Angeles México affiliation.

No complete professional phone number was verified in these profiles, so phone/email channels are not invented. Credentials, purchasing authority, current product preferences and procedure volume remain unverified. Drafts ask for the appropriate technical/purchasing contact.

[IMSS endoscopy clarification record, Puebla, 2026](https://reposipot.imss.gob.mx/OOAD/UMAE/ESP-Puebla/UMAE%20HE%20PUEBLA/2026/Expediente/LA-046-N10-26_Junta.pdf): procedure LA-50-GYR-050GYR046-N-10-2026 concerns an integrated minimally invasive digestive endoscopy service. It illustrates that procedure-heavy products may still sit within institutional procurement. The example is historical; its current procedure status and deadline are unverified. A service bundle is not represented as a stand-alone consumables purchase.

## Remaining research validation

Live outputs require a separate smoke test in both modes and manual review of each retained claim. The saved examples are manually assembled, not presented as measured AI results. Conflicting or ambiguous identities should be excluded or explicitly unresolved. Directory listings do not establish buying intent or decision-making authority.
