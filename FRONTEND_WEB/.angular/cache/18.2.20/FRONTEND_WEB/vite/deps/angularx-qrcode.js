import {
  require_browser
} from "./chunk-DD4MWI3R.js";
import {
  DomSanitizer
} from "./chunk-SSELZISG.js";
import "./chunk-47SDFCU7.js";
import "./chunk-HPSAVWKV.js";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
  Renderer2,
  ViewChild,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵclassMap,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵloadQuery,
  ɵɵqueryRefresh,
  ɵɵviewQuery
} from "./chunk-56G56EPG.js";
import "./chunk-WPM5VTLQ.js";
import "./chunk-PEBH6BBU.js";
import "./chunk-4S3KYZTJ.js";
import {
  __async,
  __toESM
} from "./chunk-TXDUYLVM.js";

// node_modules/angularx-qrcode/fesm2022/angularx-qrcode.mjs
var import_qrcode = __toESM(require_browser(), 1);
var _c0 = ["qrcElement"];
var QRCodeComponent = class _QRCodeComponent {
  constructor(renderer, sanitizer) {
    this.renderer = renderer;
    this.sanitizer = sanitizer;
    this.allowEmptyString = false;
    this.colorDark = "#000000ff";
    this.colorLight = "#ffffffff";
    this.cssClass = "qrcode";
    this.elementType = "canvas";
    this.errorCorrectionLevel = "M";
    this.margin = 4;
    this.qrdata = "";
    this.scale = 4;
    this.width = 10;
    this.qrCodeURL = new EventEmitter();
    this.context = null;
  }
  ngOnChanges() {
    return __async(this, null, function* () {
      yield this.createQRCode();
    });
  }
  isValidQrCodeText(data) {
    if (this.allowEmptyString === false) {
      return !(typeof data === "undefined" || data === "" || data === "null" || data === null);
    }
    return !(typeof data === "undefined");
  }
  toDataURL(qrCodeConfig) {
    return new Promise((resolve, reject) => {
      (0, import_qrcode.toDataURL)(this.qrdata, qrCodeConfig, (err, url) => {
        if (err) {
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  }
  toCanvas(canvas, qrCodeConfig) {
    return new Promise((resolve, reject) => {
      (0, import_qrcode.toCanvas)(canvas, this.qrdata, qrCodeConfig, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve("success");
        }
      });
    });
  }
  toSVG(qrCodeConfig) {
    return new Promise((resolve, reject) => {
      (0, import_qrcode.toString)(this.qrdata, qrCodeConfig, (err, url) => {
        if (err) {
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  }
  renderElement(element) {
    for (const node of this.qrcElement.nativeElement.childNodes) {
      this.renderer.removeChild(this.qrcElement.nativeElement, node);
    }
    this.renderer.appendChild(this.qrcElement.nativeElement, element);
  }
  createQRCode() {
    return __async(this, null, function* () {
      if (this.version && this.version > 40) {
        console.warn("[angularx-qrcode] max value for `version` is 40");
        this.version = 40;
      } else if (this.version && this.version < 1) {
        console.warn("[angularx-qrcode]`min value for `version` is 1");
        this.version = 1;
      } else if (this.version !== void 0 && isNaN(this.version)) {
        console.warn("[angularx-qrcode] version should be a number, defaulting to auto.");
        this.version = void 0;
      }
      try {
        if (!this.isValidQrCodeText(this.qrdata)) {
          throw new Error("[angularx-qrcode] Field `qrdata` is empty, set 'allowEmptyString=\"true\"' to overwrite this behaviour.");
        }
        if (this.isValidQrCodeText(this.qrdata) && this.qrdata === "") {
          this.qrdata = " ";
        }
        const config = {
          color: {
            dark: this.colorDark,
            light: this.colorLight
          },
          errorCorrectionLevel: this.errorCorrectionLevel,
          margin: this.margin,
          scale: this.scale,
          version: this.version,
          width: this.width
        };
        const centerImageSrc = this.imageSrc;
        const centerImageHeight = this.imageHeight || 40;
        const centerImageWidth = this.imageWidth || 40;
        switch (this.elementType) {
          case "canvas": {
            const canvasElement = this.renderer.createElement("canvas");
            this.context = canvasElement.getContext("2d");
            this.toCanvas(canvasElement, config).then(() => {
              if (this.ariaLabel) {
                this.renderer.setAttribute(canvasElement, "aria-label", `${this.ariaLabel}`);
              }
              if (this.title) {
                this.renderer.setAttribute(canvasElement, "title", `${this.title}`);
              }
              if (centerImageSrc && this.context) {
                this.centerImage = new Image(centerImageWidth, centerImageHeight);
                if (centerImageSrc !== this.centerImage.src) {
                  this.centerImage.src = centerImageSrc;
                }
                if (centerImageHeight !== this.centerImage.height) {
                  this.centerImage.height = centerImageHeight;
                }
                if (centerImageWidth !== this.centerImage.width) {
                  this.centerImage.width = centerImageWidth;
                }
                const centerImage = this.centerImage;
                if (centerImage) {
                  centerImage.onload = () => {
                    this.context?.drawImage(centerImage, canvasElement.width / 2 - centerImageWidth / 2, canvasElement.height / 2 - centerImageHeight / 2, centerImageWidth, centerImageHeight);
                  };
                }
              }
              this.renderElement(canvasElement);
              this.emitQRCodeURL(canvasElement);
            }).catch((e) => {
              console.error("[angularx-qrcode] canvas error:", e);
            });
            break;
          }
          case "svg": {
            const svgParentElement = this.renderer.createElement("div");
            this.toSVG(config).then((svgString) => {
              this.renderer.setProperty(svgParentElement, "innerHTML", svgString);
              const svgElement = svgParentElement.firstChild;
              this.renderer.setAttribute(svgElement, "height", `${this.width}`);
              this.renderer.setAttribute(svgElement, "width", `${this.width}`);
              this.renderElement(svgElement);
              this.emitQRCodeURL(svgElement);
            }).catch((e) => {
              console.error("[angularx-qrcode] svg error:", e);
            });
            break;
          }
          case "url":
          case "img":
          default: {
            const imgElement = this.renderer.createElement("img");
            this.toDataURL(config).then((dataUrl) => {
              if (this.alt) {
                imgElement.setAttribute("alt", this.alt);
              }
              if (this.ariaLabel) {
                imgElement.setAttribute("aria-label", this.ariaLabel);
              }
              imgElement.setAttribute("src", dataUrl);
              if (this.title) {
                imgElement.setAttribute("title", this.title);
              }
              this.renderElement(imgElement);
              this.emitQRCodeURL(imgElement);
            }).catch((e) => {
              console.error("[angularx-qrcode] img/url error:", e);
            });
          }
        }
      } catch (e) {
        console.error("[angularx-qrcode] Error generating QR Code:", e.message);
      }
    });
  }
  emitQRCodeURL(element) {
    const className = element.constructor.name;
    if (className === SVGSVGElement.name) {
      const svgHTML = element.outerHTML;
      const blob = new Blob([svgHTML], {
        type: "image/svg+xml"
      });
      const urlSvg = URL.createObjectURL(blob);
      const urlSanitized = this.sanitizer.bypassSecurityTrustUrl(urlSvg);
      this.qrCodeURL.emit(urlSanitized);
      return;
    }
    let urlImage = "";
    if (className === HTMLCanvasElement.name) {
      urlImage = element.toDataURL("image/png");
    }
    if (className === HTMLImageElement.name) {
      urlImage = element.src;
    }
    fetch(urlImage).then((urlResponse) => urlResponse.blob()).then((blob) => URL.createObjectURL(blob)).then((url) => this.sanitizer.bypassSecurityTrustUrl(url)).then((urlSanitized) => {
      this.qrCodeURL.emit(urlSanitized);
    }).catch((error) => {
      console.error("[angularx-qrcode] Error when fetching image/png URL: " + error);
    });
  }
  static {
    this.ɵfac = function QRCodeComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QRCodeComponent)(ɵɵdirectiveInject(Renderer2), ɵɵdirectiveInject(DomSanitizer));
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _QRCodeComponent,
      selectors: [["qrcode"]],
      viewQuery: function QRCodeComponent_Query(rf, ctx) {
        if (rf & 1) {
          ɵɵviewQuery(_c0, 7);
        }
        if (rf & 2) {
          let _t;
          ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.qrcElement = _t.first);
        }
      },
      inputs: {
        allowEmptyString: "allowEmptyString",
        colorDark: "colorDark",
        colorLight: "colorLight",
        cssClass: "cssClass",
        elementType: "elementType",
        errorCorrectionLevel: "errorCorrectionLevel",
        imageSrc: "imageSrc",
        imageHeight: "imageHeight",
        imageWidth: "imageWidth",
        margin: "margin",
        qrdata: "qrdata",
        scale: "scale",
        version: "version",
        width: "width",
        alt: "alt",
        ariaLabel: "ariaLabel",
        title: "title"
      },
      outputs: {
        qrCodeURL: "qrCodeURL"
      },
      features: [ɵɵNgOnChangesFeature],
      decls: 2,
      vars: 2,
      consts: [["qrcElement", ""]],
      template: function QRCodeComponent_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵelement(0, "div", null, 0);
        }
        if (rf & 2) {
          ɵɵclassMap(ctx.cssClass);
        }
      },
      encapsulation: 2,
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QRCodeComponent, [{
    type: Component,
    args: [{
      selector: "qrcode",
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div #qrcElement [class]="cssClass"></div>`
    }]
  }], () => [{
    type: Renderer2
  }, {
    type: DomSanitizer
  }], {
    allowEmptyString: [{
      type: Input
    }],
    colorDark: [{
      type: Input
    }],
    colorLight: [{
      type: Input
    }],
    cssClass: [{
      type: Input
    }],
    elementType: [{
      type: Input
    }],
    errorCorrectionLevel: [{
      type: Input
    }],
    imageSrc: [{
      type: Input
    }],
    imageHeight: [{
      type: Input
    }],
    imageWidth: [{
      type: Input
    }],
    margin: [{
      type: Input
    }],
    qrdata: [{
      type: Input
    }],
    scale: [{
      type: Input
    }],
    version: [{
      type: Input
    }],
    width: [{
      type: Input
    }],
    alt: [{
      type: Input
    }],
    ariaLabel: [{
      type: Input
    }],
    title: [{
      type: Input
    }],
    qrCodeURL: [{
      type: Output
    }],
    qrcElement: [{
      type: ViewChild,
      args: ["qrcElement", {
        static: true
      }]
    }]
  });
})();
var QRCodeModule = class _QRCodeModule {
  static {
    this.ɵfac = function QRCodeModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QRCodeModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _QRCodeModule,
      declarations: [QRCodeComponent],
      exports: [QRCodeComponent]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QRCodeModule, [{
    type: NgModule,
    args: [{
      providers: [],
      declarations: [QRCodeComponent],
      exports: [QRCodeComponent]
    }]
  }], null, null);
})();
export {
  QRCodeComponent,
  QRCodeModule
};
//# sourceMappingURL=angularx-qrcode.js.map
