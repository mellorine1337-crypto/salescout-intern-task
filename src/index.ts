import { app } from "./server";

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`SaleScout API running on http://localhost:${port}`));
