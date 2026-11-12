import { getApiKeys } from "@/lib/data/api-key-dto";
import ApiKeysPanel from "./ApiKeysPanel";

export default async function ApiKeysPage() {
  return <ApiKeysPanel keys={await getApiKeys()} />;
}
