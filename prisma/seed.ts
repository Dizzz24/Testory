import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Starting database seed...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@laptop.com" },
    update: {},
    create: {
      email: "admin@laptop.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("✅ Admin created:", admin.email);

  // 2. Create Sample Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Lenovo ThinkPad X1 Carbon Gen 11",
        brand: "Lenovo",
        processor: "Intel Core i7-1365U",
        ram: "16GB LPDDR5",
        storage: "512GB NVMe SSD",
        gpu: "Intel Iris Xe",
        display: "14 inch 2.8K OLED",
        price: 25000000,
        stock: 10,
        status: "READY",
        images: [
          "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
        ],
        description:
          "Laptop bisnis premium dengan layar OLED dan build quality terbaik di kelasnya.",
      },
    }),

    prisma.product.create({
      data: {
        name: "Dell XPS 13 Plus",
        brand: "Dell",
        processor: "Intel Core i5-1340P",
        ram: "16GB LPDDR5",
        storage: "512GB NVMe SSD",
        gpu: null,
        display: "13.4 inch FHD+",
        originalPrice: 20000000,
        price: 17000000,
        stock: 5,
        status: "READY",
        images: [
          "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
        ],
        description:
          "Laptop ultrabook dengan desain minimalis dan performa maksimal.",
      },
    }),

    prisma.product.create({
      data: {
        name: "ASUS ROG Zephyrus G14",
        brand: "Asus",
        processor: "AMD Ryzen 9 7940HS",
        ram: "32GB DDR5",
        storage: "1TB NVMe SSD",
        gpu: "NVIDIA RTX 4060",
        display: "14 inch QHD 165Hz",
        price: 28000000,
        stock: 3,
        status: "READY",
        images: [
          "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
        ],
        description: "Gaming laptop compact dengan performa luar biasa.",
      },
    }),

    prisma.product.create({
      data: {
        name: 'MacBook Pro M3 14"',
        brand: "Apple",
        processor: "Apple M3",
        ram: "16GB Unified Memory",
        storage: "512GB SSD",
        gpu: "Apple M3 GPU",
        display: "14.2 inch Liquid Retina XDR",
        price: 32000000,
        stock: 0,
        status: "INCOMING",
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
        ],
        description:
          "Laptop untuk creative professional dengan chip M3 terbaru.",
      },
    }),

    prisma.product.create({
      data: {
        name: "HP Spectre x360 14",
        brand: "HP",
        processor: "Intel Core i7-1355U",
        ram: "16GB LPDDR4x",
        storage: "1TB NVMe SSD",
        gpu: "Intel Iris Xe",
        display: "13.5 inch 3K2K OLED Touchscreen",
        price: 24000000,
        stock: 7,
        status: "READY",
        images: [
          "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800",
        ],
        description:
          "Convertible laptop dengan layar touchscreen berkualitas tinggi.",
      },
    }),
  ]);

  console.log("\n Seed completed successfully!");
  console.log("   Email: admin@laptop.com Password: admin123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
