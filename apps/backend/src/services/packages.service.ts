import prisma from '../db/prisma';

export type PackageInput = {
  name: string;
  rateLimit?: string | null;
  localAddress?: string | null;
  remoteAddressPool?: string | null;
};

const normalizePackageInput = (input: PackageInput) => ({
  name: input.name,
  rateLimit: input.rateLimit ?? null,
  localAddress: input.localAddress ?? null,
  remoteAddressPool: input.remoteAddressPool ?? null
});

export const upsertPackageFromProfile = async (input: PackageInput) => {
  const data = normalizePackageInput(input);
  return prisma.internetPackage.upsert({
    where: { name: data.name },
    update: {
      rateLimit: data.rateLimit,
      localAddress: data.localAddress,
      remoteAddressPool: data.remoteAddressPool,
      isActive: true
    },
    create: {
      name: data.name,
      rateLimit: data.rateLimit,
      localAddress: data.localAddress,
      remoteAddressPool: data.remoteAddressPool,
      isActive: true
    }
  });
};

export const deactivatePackage = async (name: string) => {
  return prisma.internetPackage.updateMany({
    where: { name },
    data: { isActive: false }
  });
};

export const syncPackagesFromProfiles = async (profiles: PackageInput[]) => {
  const payloads = profiles.map(normalizePackageInput);
  const names = payloads.map((item) => item.name);

  await prisma.$transaction(async (tx) => {
    for (const payload of payloads) {
      await tx.internetPackage.upsert({
        where: { name: payload.name },
        update: {
          rateLimit: payload.rateLimit,
          localAddress: payload.localAddress,
          remoteAddressPool: payload.remoteAddressPool,
          isActive: true
        },
        create: {
          name: payload.name,
          rateLimit: payload.rateLimit,
          localAddress: payload.localAddress,
          remoteAddressPool: payload.remoteAddressPool,
          isActive: true
        }
      });
    }

    if (names.length > 0) {
      await tx.internetPackage.updateMany({
        where: { name: { notIn: names } },
        data: { isActive: false }
      });
    }
  });
};

export const upsertUserPackage = async (username: string, packageName: string | null) => {
  if (!packageName) {
    return prisma.pppoeUserPackage.upsert({
      where: { username },
      update: { packageId: null, packageName: null },
      create: { username, packageId: null, packageName: null }
    });
  }

  const existingPackage = await prisma.internetPackage.findUnique({
    where: { name: packageName },
    select: { id: true, name: true }
  });

  return prisma.pppoeUserPackage.upsert({
    where: { username },
    update: {
      packageId: existingPackage?.id ?? null,
      packageName: existingPackage?.name ?? packageName
    },
    create: {
      username,
      packageId: existingPackage?.id ?? null,
      packageName: existingPackage?.name ?? packageName
    }
  });
};

export const removeUserPackage = async (username: string) => {
  return prisma.pppoeUserPackage.deleteMany({ where: { username } });
};
