# Observaciones del catálogo de destinos de RallyTraver

## Alcance de esta actualización

Este documento registra las decisiones y los datos que requieren confirmación antes de presentar el catálogo como una oferta comercial definitiva. La información se organizó a partir de `DESCRIPCIONES DESTINOS TURISTICOS.docx` y se incorporó como datos de demostración en el catálogo técnico.

Todos los valores están expresados en pesos colombianos (COP) y se muestran como **precios referenciales**. La disponibilidad y la tarifa final deben confirmarse antes de cualquier venta.

## Correspondencia entre la fuente y el catálogo

| Documento fuente | Nombre conservado en RallyTraver | Observación |
| --- | --- | --- |
| Egipto Turquía | Egipto y Turquía | Se conserva el nombre existente para actualizar el mismo registro sin duplicarlo. |
| Tours a Grecia | Grecia clásica | Se conserva el nombre existente del catálogo. |
| Dubai | Dubái | Se conserva la tilde usada en la aplicación. |
| Italia | Italia esencial | Se conserva el nombre existente del catálogo. |
| México - Cancún | Cancún y Ciudad de México | Se conserva el nombre existente del catálogo. |
| Santa Marta / Parque Tayrona | Parque Tayrona | Se mantiene como destino de Parque Tayrona con referencia a Santa Marta. |
| Amazonas | Leticia y Amazonas | Se conserva el nombre existente del catálogo. |
| Nuquí | Nuquí y avistamiento de ballenas | Se conserva el nombre existente del catálogo. |

## Datos que requieren confirmación

- **Grecia clásica:** la fuente menciona simultáneamente viaje grupal de 30 personas y modalidad personalizada. Se registró como “Grupo / personalizado (por confirmar)”.
- **Dubái:** la fuente informa 3 países y 8 ciudades, pero no especifica sus nombres. Por ello se conserva la cantidad y se deja la lista vacía. También debe confirmarse la asociación de **Hilton Pyramids Golf** con este itinerario.
- **Italia esencial:** el dato “grupo de 2 personas” no aclara si corresponde al mínimo de reserva o al tamaño del grupo; se dejó como observación. El itinerario repite Roma al inicio y al final, por lo que no se calculó una cantidad única de ciudades.
- **Cancún y Ciudad de México:** se especifican tres noches en Ciudad de México y tres en Cancún, pero no se informa el total de días. Se registra como seis noches y días por confirmar.
- **Medellín:** la fuente informa dos días, sin indicar cantidad de noches.
- **San Andrés:** la tarifa de referencia se tomó del documento fuente. Deben confirmarse disponibilidad, hotel asignado y temporada.
- **Leticia y Amazonas:** se indica “todo incluido”; los servicios exactos incluidos deben detallarse antes de una cotización o venta.
- **Nuquí y avistamiento de ballenas:** se conserva temporalmente como `pasadia` porque así estaba clasificado en el catálogo existente, pero la fuente informa una noche de estancia, sin total de días. Antes de publicar debe confirmarse si corresponde reclasificarlo como paquete nacional. El avistamiento de ballenas debe validarse según temporada y condiciones de operación.
- **Pasadías (Magüipi, Piangüita y Salento):** se registran con salida y regreso el mismo día cuando la fuente lo indica; faltan horarios, punto de salida y servicios incluidos.

## Criterio técnico aplicado

- El campo `precio` guarda el menor precio informado para cada destino, para conservar la compatibilidad con la interfaz actual.
- Los valores por temporada, tipo de acomodación, duración, hoteles e itinerario se guardan en campos adicionales del modelo sin modificar el contrato de datos que ya consume el frontend.
- Las rutas de imágenes se mantienen relativas a `Images/destinos/imagenes destinos/`; no se movieron ni renombraron archivos.
- Los datos incompletos se dejaron vacíos, nulos o marcados “por confirmar”; no se inventaron fechas, ciudades, servicios ni inclusiones.
