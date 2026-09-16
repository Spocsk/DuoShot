describe("example zip", () => {
  it("returns a Connect-ready ZIP", () => {
    cy.request({
      url: "/api/example-zip?v=2",
      encoding: "binary",
      timeout: 60_000,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(String(response.headers["content-type"])).to.include("application/zip");
      expect(String(response.headers["content-disposition"] ?? "")).to.include("duoshot-example.zip");
      expect(String(response.headers["content-disposition"] ?? "")).to.not.include("landscape");
      expect(response.body.length).to.be.greaterThan(1000);
    });
  });
});
