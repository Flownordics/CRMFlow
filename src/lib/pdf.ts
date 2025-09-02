export { generatePDF, downloadPDF } from "@/services/PDFService";

// Eksempel brug (i Quote/Order/Invoice pages):
// import { generatePDF } from "@/lib/pdf";
// import { Button } from "@/components/ui/button";
//
// function Actions({ id }: { id: string }) {
//   const onPreview = async () => {
//     const url = await generatePDF("quote", id);
//     window.open(url, "_blank");
//   };
//   return <Button onClick={onPreview}>Preview PDF</Button>;
// }

// Backend kan senere bruge Playwright til PDF-render.
