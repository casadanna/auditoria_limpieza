/**
 * Casa Danna - Google Apps Script Backend (Tablets - V3 con Gráficas)
 */

function doPost(e) {
  try {
    var rawData = e.parameter.data || (e.postData ? e.postData.contents : null);
    if (!rawData) {
      return ContentService.createTextOutput("Error: No data").setMimeType(ContentService.MimeType.TEXT);
    }
    
    var data = JSON.parse(rawData);
    var details = data.detalles;
    var auditor = data.auditora || "Desconocida";
    
    // Conectar explícitamente por el ID de tu Google Sheet
    var sheetId = "13n-axaQAwd1R6gqJciwwnYf29MqSdZVVQviWIeujJlk";
    var ss = SpreadsheetApp.openById(sheetId);
    
    // 1. Manejo de hoja principal
    var sheet = ss.getSheetByName("Registros_V2");
    if (!sheet) {
      sheet = ss.insertSheet("Registros_V2");
      sheet.appendRow([
        "Fecha", "Auditora", "Habitación", "Cama", "Baño", "Barra", 
        "Basura", "Puertas", "Ventanas", "Escritorio", "Piso", "Pelos/Peluzas"
      ]);
      sheet.getRange("A1:L1").setFontWeight("bold");
    }
    
    // Formatear Fecha ("dd/MM/yyyy")
    var d = new Date(data.fecha || new Date());
    var dateStr = Utilities.formatDate(d, "America/Mexico_City", "dd/MM/yyyy");
    
    function formatItem(itemKey) {
      if (!details[itemKey]) return "-";
      var val = details[itemKey].status || "-";
      if (details[itemKey].comment) {
        val += "\n💬 " + details[itemKey].comment;
      }
      return val;
    }
    
    var rowData = [
      dateStr, // A
      auditor, // B
      "Hab. " + data.habitacion, // C
      formatItem('cama'), // D
      formatItem('bano'), // E
      formatItem('barra'), // F
      formatItem('basura'), // G
      formatItem('puertas'), // H
      formatItem('ventanas'), // I
      formatItem('escritorio'), // J
      formatItem('piso'), // K
      formatItem('pelos') // L
    ];
    
    sheet.appendRow(rowData);
    var lastRow = sheet.getLastRow();
    
    // 2. Colores y Agrupación por Día
    var groupColor = "#ffffff"; 
    if (lastRow > 2) {
      var prevDate = sheet.getRange(lastRow - 1, 1).getDisplayValue();
      var prevColor = sheet.getRange(lastRow - 1, 1).getBackground();
      if (prevDate == dateStr) {
        groupColor = prevColor; // Mismo día, conserva color
      } else {
        // En un nuevo día, cambia a un gris muy sutil para diferenciar en bloque visual
        groupColor = (prevColor === "#ffffff") ? "#f3f4f6" : "#ffffff";
      }
    }
    // Color de los primeros 3 (Fecha, Auditora, Habitación)
    sheet.getRange(lastRow, 1, 1, 3).setBackground(groupColor);
    
    // Pintar Celdas de Checklist individualmente (Bien/Regular/Mal)
    for (var col = 4; col <= 12; col++) {
      var cellValue = rowData[col - 1].toString();
      var cellRange = sheet.getRange(lastRow, col);
      if (cellValue.indexOf("Mal") !== -1) {
        cellRange.setBackground("#f4c7c3"); // Rojo
      } else if (cellValue.indexOf("Regular") !== -1) {
        cellRange.setBackground("#fce8b2"); // Amarillo
      } else if (cellValue.indexOf("Bien") !== -1) {
        cellRange.setBackground("#b7e1cd"); // Verde
      } else {
        cellRange.setBackground("#ffffff");
      }
    }
    
    sheet.setRowHeight(lastRow, 40); 
    sheet.getRange(lastRow, 1, 1, 12).setWrap(true).setVerticalAlignment("middle");
    
    // 3. Crear Dashboard y Gráfica Diaria
    var dashSheet = ss.getSheetByName("Dashboard_Diario");
    if (!dashSheet) {
      dashSheet = ss.insertSheet("Dashboard_Diario");
      dashSheet.getRange("A1").setValue("Estadísticas de Limpieza").setFontWeight("bold").setFontSize(16);
      dashSheet.getRange("A2").setValue("Día Activo:");
      dashSheet.getRange("A4:B4").setValues([["Estado", "Total Puntos Auditados"]]).setFontWeight("bold").setBackground("#f0f0f0");
    }
    
    dashSheet.getRange("B2").setValue(dateStr).setFontSize(14).setFontWeight("bold");
    
    // Contar TODO lo de este día usando los datos visuales
    var allData = sheet.getDataRange().getDisplayValues();
    var countBien = 0, countRegular = 0, countMal = 0;
    
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === dateStr) {
        for (var c = 3; c <= 11; c++) {
          var val = allData[i][c].toString();
          if (val.indexOf("Bien") !== -1) countBien++;
          else if (val.indexOf("Regular") !== -1) countRegular++;
          else if (val.indexOf("Mal") !== -1) countMal++;
        }
      }
    }
    
    // Escribir en Dashboard
    dashSheet.getRange("A5:B7").setValues([
      ["Bien", countBien],
      ["Regular", countRegular],
      ["Mal", countMal]
    ]);
    dashSheet.getRange("A5").setBackground("#b7e1cd");
    dashSheet.getRange("A6").setBackground("#fce8b2");
    dashSheet.getRange("A7").setBackground("#f4c7c3");
    
    // Checar si hay gráfica, si no, crearla dinámicamente conectada a la tabla
    var charts = dashSheet.getCharts();
    if (charts.length === 0) {
      var chartBuilder = dashSheet.newChart()
        .asPieChart()
        .addRange(dashSheet.getRange("A4:B7"))
        .setPosition(1, 4, 0, 0)
        .setOption('title', 'Limpieza del Día de Hoy')
        .setOption('pieSliceText', 'value')
        .setOption('colors', ['#34a853', '#fbbc04', '#ea4335']); // Verde, Amarillo, Rojo Google
      
      dashSheet.insertChart(chartBuilder.build());
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("La API V3 de Casa Danna con Dashboard está activa.");
}
