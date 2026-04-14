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
    var auditada = data.auditada || "No especificada";
    
    // Conectar explícitamente por el ID de tu Google Sheet
    var sheetId = "13n-axaQAwd1R6gqJciwwnYf29MqSdZVVQviWIeujJlk";
    var ss = SpreadsheetApp.openById(sheetId);
    
    // 1. Manejo de hoja principal
    var sheet = ss.getSheetByName("Registros_V2");
    if (!sheet) {
      sheet = ss.insertSheet("Registros_V2");
      sheet.appendRow([
        "Fecha", "Auditora", "Auditada", "Habitación", "Cama", "Baño", "Barra", 
        "Basura", "Puertas", "Ventanas", "Escritorio", "Piso", "Pelos/Peluzas"
      ]);
      sheet.getRange("A1:M1").setFontWeight("bold");
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
      auditada, // C
      "Hab. " + data.habitacion, // D
      formatItem('cama'), // E
      formatItem('bano'), // F
      formatItem('barra'), // G
      formatItem('basura'), // H
      formatItem('puertas'), // I
      formatItem('ventanas'), // J
      formatItem('escritorio'), // K
      formatItem('piso'), // L
      formatItem('pelos') // M
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
    // Color de los primeros 4 (Fecha, Auditora, Auditada, Habitación)
    sheet.getRange(lastRow, 1, 1, 4).setBackground(groupColor);
    
    // Pintar Celdas de Checklist individualmente (Bien/Regular/Mal)
    for (var col = 5; col <= 13; col++) {
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
    sheet.getRange(lastRow, 1, 1, 13).setWrap(true).setVerticalAlignment("middle");
    
    // 3. Crear Dashboard y Gráfica Diaria
    var dashSheet = ss.getSheetByName("Dashboard_Diario");
    if (!dashSheet) {
      dashSheet = ss.insertSheet("Dashboard_Diario");
      dashSheet.getRange("A1").setValue("Estadísticas de Limpieza").setFontWeight("bold").setFontSize(16);
      dashSheet.getRange("A2").setValue("Día Activo:");
      dashSheet.getRange("A4:B4").setValues([["Estado", "Total Puntos Auditados"]]).setFontWeight("bold").setBackground("#f0f0f0");
    }
    
    dashSheet.getRange("B2").setValue(dateStr).setFontSize(14).setFontWeight("bold");
    
    // 4. Estadísticas por Auditada
    var allData = sheet.getDataRange().getDisplayValues();
    var stats = {}; // { "Ruby": { Bien: 10, Regular: 2, Mal: 1 }, ... }
    
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === dateStr) {
        var person = allData[i][2]; // Auditada
        if (!stats[person]) stats[person] = { Bien: 0, Regular: 0, Mal: 0 };
        
        for (var c = 4; c <= 12; c++) {
          var val = allData[i][c].toString();
          if (val.indexOf("Bien") !== -1) stats[person].Bien++;
          else if (val.indexOf("Regular") !== -1) stats[person].Regular++;
          else if (val.indexOf("Mal") !== -1) stats[person].Mal++;
        }
      }
    }
    
    // Limpiar área de dashboard
    dashSheet.getRange("A4:Z100").clear();
    
    var currentLine = 4;
    for (var person in stats) {
      dashSheet.getRange(currentLine, 1).setValue("Auditada: " + person).setFontWeight("bold").setBackground("#e2e8f0");
      dashSheet.getRange(currentLine, 2).setValue("Puntos").setFontWeight("bold").setBackground("#e2e8f0");
      
      var startRow = currentLine + 1;
      var dataToRows = [
        ["Bien", stats[person].Bien],
        ["Regular", stats[person].Regular],
        ["Mal", stats[person].Mal]
      ];
      dashSheet.getRange(startRow, 1, 3, 2).setValues(dataToRows);
      
      // Colores
      dashSheet.getRange(startRow, 1).setBackground("#b7e1cd");
      dashSheet.getRange(startRow + 1, 1).setBackground("#fce8b2");
      dashSheet.getRange(startRow + 2, 1).setBackground("#f4c7c3");
      
      // Crear/Actualizar Gráfica para esta persona
      var charts = dashSheet.getCharts();
      var chartTitle = "Limpieza: " + person + " (" + dateStr + ")";
      
      var chartBuilder = dashSheet.newChart()
        .asPieChart()
        .addRange(dashSheet.getRange(startRow, 1, 3, 2))
        .setPosition(currentLine, 4, 0, 0)
        .setOption('title', chartTitle)
        .setOption('pieSliceText', 'value')
        .setOption('colors', ['#34a853', '#fbbc04', '#ea4335']);
      
      dashSheet.insertChart(chartBuilder.build());
      
      currentLine += 5; // Espacio para la siguiente tabla/gráfica
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("La API V3 de Casa Danna con Dashboard está activa.");
}
