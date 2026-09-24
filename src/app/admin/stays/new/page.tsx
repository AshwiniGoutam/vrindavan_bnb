import StayForm from "@/components/admin/StayForm";
import { getCollections } from "@/lib/content";

export const metadata = { title: "Add stay" };

export default async function NewStay() {
  return (<div><h1 className="mb-6 text-3xl">Add a stay</h1><StayForm collections={await getCollections()} /></div>);
}
