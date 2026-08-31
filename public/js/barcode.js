/**
 * Barcode Module
 * Renders product barcodes with JsBarcode and simulates barcode scanner lookups
 */
const BarcodeModule = (function () {
  function renderProductBarcode(svgId, barcodeVal) {
    if (typeof JsBarcode !== 'undefined' && barcodeVal) {
      try {
        JsBarcode(`#${svgId}`, barcodeVal, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }

  function generateRandomBarcode() {
    return '890' + Math.floor(1000000000 + Math.random() * 9000000000);
  }

  function initScannerModal() {
    const modal = document.getElementById('barcode-modal');
    if (modal) modal.classList.add('show');
  }

  function closeScannerModal() {
    const modal = document.getElementById('barcode-modal');
    if (modal) modal.classList.remove('show');
  }

  return {
    renderProductBarcode,
    generateRandomBarcode,
    initScannerModal,
    closeScannerModal
  };
})();
