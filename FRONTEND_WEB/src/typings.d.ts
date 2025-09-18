declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF; // Método para generar tablas
    previousAutoTable: { 
      finalY: number; // Posición Y de la última tabla generada
    };
  }
}