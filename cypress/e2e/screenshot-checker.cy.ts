function imageFile(doc: Document, width: number, height: number, fileName: string, transparent = false) {
  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#143248";
  context.fillRect(0, 0, width, height);
  if (transparent) context.clearRect(width - 1, height - 1, 1, 1);
  const mimeType = transparent ? "image/png" : "image/jpeg";
  const contents = Cypress.Buffer.from(canvas.toDataURL(mimeType).split(",")[1], "base64");
  canvas.width = canvas.height = 0;
  return { contents, fileName, mimeType };
}

describe("free client-side screenshot checker", () => {
  for (const locale of ["fr", "en"] as const) {
    const prefix = locale === "en" ? "/en" : "";
    const visit = () => locale === "fr"
      ? cy.visitFr(`${prefix}/tools/iphone-duo-screenshot-checker`)
      : cy.visitEn(`${prefix}/tools/iphone-duo-screenshot-checker`);

    it(`checks all sizes, transparency and unreadable files without uploading in ${locale}`, () => {
      cy.intercept("POST", "**/api/**").as("apiPost");
      cy.intercept("PUT", "**").as("put");
      visit();
      cy.get("#checker-files").focus().should("have.focus").and("not.be.disabled");
      cy.document().then((doc) => {
        const sizes = [[1398, 2034], [2007, 2853], [1320, 2868], [1206, 2622]];
        const files = sizes.flatMap(([width, height]) => [
          imageFile(doc, width, height, `${width}x${height}.jpg`),
          imageFile(doc, height, width, `${height}x${width}.jpg`),
        ]);
        cy.get("#checker-files").selectFile([
          ...files, imageFile(doc, 32, 32, "wrong.jpg"),
          imageFile(doc, 1398, 2034, "transparent.png", true),
          { contents: Cypress.Buffer.from("not an image"), fileName: "broken.png", mimeType: "image/png" },
        ]);
      });
      cy.get('[data-testid="checker-result"]').should("have.length", 11);
      cy.get("#checker-files").should("not.be.disabled");
      for (const [width, height] of [[1398, 2034], [2007, 2853], [1320, 2868], [1206, 2622]]) {
        cy.contains('[data-testid="checker-result"]', `${width}x${height}.jpg`)
          .should("contain", `${width} × ${height}`)
          .and("contain", locale === "fr" ? "Dimensions correspondantes" : "Matching dimensions")
          .and("contain", "Portrait")
          .and("contain", locale === "fr" ? "Aucune transparence" : "No transparency");
        cy.contains('[data-testid="checker-result"]', `${height}x${width}.jpg`)
          .should("contain", `${height} × ${width}`)
          .and("contain", locale === "fr" ? "Paysage" : "Landscape");
      }
      cy.contains('[data-testid="checker-result"]', "wrong.jpg").should("contain", locale === "fr" ? "Dimensions incorrectes" : "Wrong dimensions");
      cy.contains('[data-testid="checker-result"]', "transparent.png").should("contain", locale === "fr" ? "Transparence détectée" : "Transparency detected");
      cy.contains('[data-testid="checker-result"]', "broken.png").should("contain", locale === "fr" ? "Impossible d’analyser" : "Could not check");
      cy.get('[data-testid="checker-duo-count"]').should("contain", "5/10");
      cy.get('[data-testid="checker-duo-limit"]').should("not.exist");
      cy.get("@apiPost.all").should("have.length", 0);
      cy.get("@put.all").should("have.length", 0);
      cy.viewport(375, 812);
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1));
    });

    it(`counts mixed Duo batches together and can clear and recheck in ${locale}`, () => {
      visit();
      cy.document().then((doc) => {
        const outer = imageFile(doc, 1398, 2034, "outer.jpg");
        const inner = imageFile(doc, 2853, 2007, "inner.jpg");
        cy.get('[data-testid="checker-drop"]').selectFile(Array(6).fill(outer), { action: "drag-drop" });
        cy.get('[data-testid="checker-duo-count"]').should("contain", "6/10");
        cy.get("#checker-files").should("not.be.disabled");
        cy.get("#checker-files").selectFile(Array(4).fill(inner));
        cy.get('[data-testid="checker-duo-count"]').should("contain", "10/10");
        cy.get('[data-testid="checker-duo-limit"]').should("not.exist");
        cy.get("#checker-files").should("not.be.disabled").selectFile(inner);
        cy.get('[data-testid="checker-duo-limit"]').should("contain", locale === "fr" ? "Trop d’images Duo" : "Too many Duo images");
        cy.get('[data-testid="checker-duo-count"]').should("contain", "11/10");
        cy.contains("button", locale === "fr" ? "Effacer les résultats" : "Clear results").click();
        cy.get('[data-testid="checker-result"]').should("not.exist");
        cy.get('[data-testid="checker-duo-limit"]').should("not.exist");
        cy.get("#checker-files").selectFile(outer);
        cy.get('[data-testid="checker-duo-count"]').should("contain", "1/10");
      });
    });
  }
});
