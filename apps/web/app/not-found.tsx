import { Button } from "ui/Button";
import { AmbientScene } from "./components/AmbientScene";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
      <AmbientScene />
      <div className="relative z-10 max-w-md space-y-4 text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="text-2xl font-bold text-foreground">
          찾으시는 페이지가 없어요
        </h1>
        <p className="text-sm leading-6 text-muted">
          주소가 바뀌었거나 잘못 들어온 것 같아요. 메인에서 다시 시작해보세요.
        </p>
        <div className="pt-2">
          <Button href="/">메인으로 돌아가기</Button>
        </div>
      </div>
    </div>
  );
}
