import { createThirdwebClient } from "thirdweb";
import { polygon } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// 메인 네트워크: Polygon (수수료 저렴)
export const activeChain = polygon;
