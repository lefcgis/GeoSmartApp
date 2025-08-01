// UI Panel principal
var panel = ui.Panel({style: {width: '400px'}});
ui.root.widgets().add(panel);

// Título
panel.add(ui.Label({
  value: '🛰️ Descarga de Imágenes Satelitales (PNG o GeoTIFF)',
  style: {fontWeight: 'bold', fontSize: '18px'}
}));

// ID del shapefile subido como asset
panel.add(ui.Label('Asset del shapefile (.shp):'));
var inputAsset = ui.Textbox({placeholder: 'Pega aquí el ID del shapefile'});
panel.add(inputAsset);

// Fechas de consulta
panel.add(ui.Label('Fecha de inicio (YYYY-MM-DD):'));
var inputFechaIni = ui.Textbox({placeholder: '2025-06-25'});
panel.add(inputFechaIni);

panel.add(ui.Label('Fecha de fin (YYYY-MM-DD):'));
var inputFechaFin = ui.Textbox({placeholder: '2025-10-31'});
panel.add(inputFechaFin);

// Sensor satelital
panel.add(ui.Label('Sensor satelital:'));
var sensorSelector = ui.Select({
  items: ['Sentinel-2', 'Landsat 8'],
  value: 'Sentinel-2'
});
panel.add(sensorSelector);

// Tipo de descarga
panel.add(ui.Label('Formato de descarga:'));
var formatoSelector = ui.Select({
  items: ['GeoTIFF', 'PNG'],
  value: 'GeoTIFF'
});
panel.add(formatoSelector);

// Botón de ejecución
var boton = ui.Button({
  label: '📤 Generar imagen y exportar',
  onClick: ejecutarDescarga
});
panel.add(boton);

// Texto de estado
var status = ui.Label('');
panel.add(status);


// === Función principal ===
function ejecutarDescarga() {
  Map.clear();
  if (status) status.setValue('⏳ Procesando...');

  var assetId = inputAsset.getValue();
  var fechaIni = inputFechaIni.getValue();
  var fechaFin = inputFechaFin.getValue();
  var sensor = sensorSelector.getValue();
  var formato = formatoSelector.getValue();

  if (!assetId || !fechaIni || !fechaFin) {
    status.setValue('❌ Completa todos los campos.');
    return;
  }

  var area;
  try {
    area = ee.FeatureCollection(assetId);
  } catch (e) {
    status.setValue('❌ Error cargando el shapefile. Revisa el ID.');
    return;
  }

  var coleccion, bandas, escala;

  if (sensor === 'Sentinel-2') {
    coleccion = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(area)
      .filterDate(fechaIni, fechaFin)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
    bandas = ['B4', 'B3', 'B2'];
    escala = 10;
  } else {
    coleccion = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(area)
      .filterDate(fechaIni, fechaFin)
      .filter(ee.Filter.lt('CLOUD_COVER', 20));
    bandas = ['SR_B4', 'SR_B3', 'SR_B2'];
    escala = 30;
  }

  var imagen = coleccion.median().clip(area);

  Map.centerObject(area, 10);
  Map.addLayer(imagen, {bands: bandas, min: 0, max: 3000}, sensor + ' RGB');

  if (formato === 'GeoTIFF') {
    Export.image.toDrive({
      image: imagen.select(bandas),
      description: 'Export_' + sensor.replace(' ', '_'),
      folder: 'GEE_Export',
      fileNamePrefix: 'composite_' + sensor.replace(' ', '_'),
      region: area.geometry(),
      scale: escala,
      maxPixels: 1e13,
      fileFormat: 'GeoTIFF'
    });
    status.setValue('✅ Imagen GeoTIFF enviada a Google Drive.');
  } else if (formato === 'PNG') {
    Export.image.toDrive({
      image: imagen.visualize({bands: bandas, min: 0, max: 3000}),
      description: 'Export_' + sensor.replace(' ', '_') + '_png',
      folder: 'GEE_Export',
      fileNamePrefix: 'composite_' + sensor.replace(' ', '_') + '_png',
      region: area.geometry(),
      scale: escala,
      maxPixels: 1e13,
      fileFormat: 'PNG'
    });
    status.setValue('✅ Imagen PNG enviada a Google Drive.');
  }
}
// #fsociety