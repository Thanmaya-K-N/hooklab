import { PrismaClient } from "@prisma/client";
import {
  generateApiKey,
  generatePrefixedId,
  hashApiKey,
} from "@hooklab/shared";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.organization.findFirst();
  if (existing) {
    console.log("Seed skipped — organization already exists:", existing.id);
    return;
  }

  const apiKey = generateApiKey();
  const organization = await prisma.organization.create({
    data: {
      id: generatePrefixedId("org"),
      name: "Development",
      apiKeyHash: hashApiKey(apiKey),
    },
  });

  console.log("Created organization:", organization.name, organization.id);
  console.log("");
  console.log("Save this API key — it will not be shown again:");
  console.log(apiKey);
  console.log("");
  console.log("Example:");
  console.log(
    `curl -H "Authorization: Bearer ${apiKey}" http://127.0.0.1:3000/api/v1/endpoints`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
