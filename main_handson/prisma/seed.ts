// design/011_auth.md § 実装順序 手順 1 (seed 書換)
// default user に email + hashed password を設定し、Cookie ベースの認証で login 可能にする。
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/passwordHash";

const prisma = new PrismaClient();

async function main() {
  const defaultUserId = "user_default";
  const defaultEmail = "default@example.com";
  const defaultPassword = "Default!123";
  const passwordHash = hashPassword(defaultPassword);

  const user = await prisma.user.upsert({
    where: { id: defaultUserId },
    update: { email: defaultEmail, passwordHash, name: "Default User" },
    create: {
      id: defaultUserId,
      email: defaultEmail,
      passwordHash,
      name: "Default User",
    },
  });
  console.log(
    JSON.stringify({
      seeded: "user",
      id: user.id,
      email: user.email,
      name: user.name,
      loginPassword: defaultPassword,
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
