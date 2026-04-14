/**
 * Casa Danna - Google Apps Script Backend (Tablets - V4 con Checklist Dinámico)
 */

function doPost(e) {
  try {
    var rawData = e.parameter.data || (e.postData ? e.postData.contents : null);
    if (!rawData) {
      return ContentService.createTextOutput("Error: No data").setMimeType(ContentService.MimeType.TEXT);
    }
    
    var data = JSON.parse(rawData);
    var sheetId = "13n-axaQAwd1R6gqJciwwnYf29MqSdZVVQviWIeujJlk"; // Default Casa Danna Colima
    if (data.hotel === "Huatulco") {
      sheetId = "1pBkIaB5okWmTaEBlHQwcjdcMDaKsNAvQRkQLIaB7zp0";
    }
    var ss = SpreadsheetApp.openById(sheetId);
    
    var sheet = ss.getSheetByName("Registros_V4");
    if (!sheet) {
      sheet = ss.insertSheet("Registros_V4");
      sheet.appendRow([
        "Fecha", "Auditora", "Auditada", "Habitación", "Tiene Terraza", 
        "Puntos Completos", "Puntos Incompletos", "No Aplica", "Detalle de Fallos"
      ]);
      sheet.getRange("A1:I1").setFontWeight("bold").setBackground("#f0f0f0");
      sheet.setColumnWidth(9, 400); // Hacer mas ancha la columna de fallos
    }
    
    var d = new Date(data.fecha || new Date());
    var dateStr = Utilities.formatDate(d, "America/Mexico_City", "dd/MM/yyyy");
    
    var rowData = [
      dateStr, // A
      data.auditora || "Desconocida", // B
      data.auditada || "No especificada", // C
      "Hab. " + data.habitacion, // D
      data.terraza || "N/A", // E
      data.completo || 0, // F
      data.incompleto || 0, // G
      data.na || 0, // H
      data.fallos_str || "Todo en orden 👍" // I
    ];
    
    sheet.appendRow(rowData);
    var lastRow = sheet.getLastRow();
    
    var groupColor = "#ffffff"; 
    if (lastRow > 2) {
      var prevDate = sheet.getRange(lastRow - 1, 1).getDisplayValue();
      var prevColor = sheet.getRange(lastRow - 1, 1).getBackground();
      if (prevDate == dateStr) {
        groupColor = prevColor;
      } else {
        groupColor = (prevColor === "#ffffff") ? "#f3f4f6" : "#ffffff";
      }
    }
    
    sheet.getRange(lastRow, 1, 1, 9).setBackground(groupColor);
    
    // Si hay incompletos, pintar de rojo la celda G
    if (rowData[6] > 0) {
       sheet.getRange(lastRow, 7).setBackground("#f4c7c3").setFontWeight("bold");
    } else {
       sheet.getRange(lastRow, 7).setBackground("#b7e1cd");
    }
    // Celda completos verde
    sheet.getRange(lastRow, 6).setBackground("#b7e1cd").setFontWeight("bold");
    
    sheet.setRowHeight(lastRow, 60); 
    sheet.getRange(lastRow, 1, 1, 9).setWrap(true).setVerticalAlignment("middle");
    
    // Dashboard UPDATE
    var dashSheet = ss.getSheetByName("Dashboard_Diario");
    if (!dashSheet) {
      dashSheet = ss.insertSheet("Dashboard_Diario");
      dashSheet.getRange("A1").setValue("Estadísticas de Limpieza").setFontWeight("bold").setFontSize(16);
      dashSheet.getRange("A2").setValue("Día Activo:");
      dashSheet.getRange("A4:B4").setValues([["Estado", "Total Puntos Auditados"]]).setFontWeight("bold").setBackground("#f0f0f0");
    }
    
    dashSheet.getRange("B2").setValue(dateStr).setFontSize(14).setFontWeight("bold");
    
    var allData = sheet.getDataRange().getValues();
    var stats = {}; // { "Ruby": { completo: 10, incompleto: 2 } }
    
    for (var i = 1; i < allData.length; i++) {
        var val = allData[i][0];
        var rowDateStr = (val instanceof Date) ? Utilities.formatDate(val, "America/Mexico_City", "dd/MM/yyyy") : val.toString();
        
        if (rowDateStr === dateStr) {
            var person = allData[i][2];
            if (!stats[person]) stats[person] = { completo: 0, incompleto: 0 };
            
            stats[person].completo += Number(allData[i][5]);
            stats[person].incompleto += Number(allData[i][6]);
        }
    }
    
    dashSheet.getRange("A4:Z100").clear();
    
    var currentLine = 4;
    for (var person in stats) {
      dashSheet.getRange(currentLine, 1).setValue("Auditada: " + person).setFontWeight("bold").setBackground("#e2e8f0");
      dashSheet.getRange(currentLine, 2).setValue("Puntos Totales").setFontWeight("bold").setBackground("#e2e8f0");
      
      var startRow = currentLine + 1;
      var dataToRows = [
        ["Completo", stats[person].completo],
        ["Incompleto", stats[person].incompleto]
      ];
      dashSheet.getRange(startRow, 1, 2, 2).setValues(dataToRows);
      
      dashSheet.getRange(startRow, 1).setBackground("#b7e1cd");
      dashSheet.getRange(startRow + 1, 1).setBackground("#f4c7c3");
      
      var charts = dashSheet.getCharts();
      var chartTitle = "Limpieza: " + person + " (" + dateStr + ")";
      
      var chartBuilder = dashSheet.newChart()
        .asPieChart()
        .addRange(dashSheet.getRange(startRow, 1, 2, 2))
        .setPosition(currentLine, 4, 0, 0)
        .setOption('title', chartTitle)
        .setOption('pieSliceText', 'value')
        .setOption('colors', ['#34a853', '#ea4335']);
      
      dashSheet.insertChart(chartBuilder.build());
      currentLine += 5;
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("La API V4 de Casa Danna está lista para usarse.");
}
