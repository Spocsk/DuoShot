import { notFound } from "next/navigation";
import { DevicePage } from "@/components/device-page";
import { pageMetadata } from "@/lib/seo";
import { DEVICES, deviceBySlug, deviceGuidePath } from "@/lib/devices";
import { devicePageCopy } from "@/lib/device-page-copy";
import { pageLocale } from "../../../params";

type DeviceParams = { params: Promise<{ locale: string; device: string }> };

export function generateStaticParams() {
  return DEVICES.map((device) => ({ device: device.slug }));
}

export const dynamicParams = false;

async function resolve(params: DeviceParams["params"]) {
  const locale = await pageLocale(params);
  const { device: slug } = await params;
  const device = deviceBySlug(slug);
  if (!device) notFound();
  return { locale, device };
}

export async function generateMetadata({ params }: DeviceParams) {
  const { locale, device } = await resolve(params);
  const copy = devicePageCopy(locale, device);
  return pageMetadata({ locale, path: deviceGuidePath(device.slug), title: copy.title, description: copy.description });
}

export default async function Page({ params }: DeviceParams) {
  const { locale, device } = await resolve(params);
  return <DevicePage locale={locale} device={device} />;
}
