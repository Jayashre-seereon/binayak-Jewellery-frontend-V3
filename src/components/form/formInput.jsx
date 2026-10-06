import { useFormContext } from "react-hook-form";

export default function FormInput({ name, label, type = "text" }) {
  const { register } = useFormContext();

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm">{label}</label>
      <input
        {...register(name)}
        type={type}
        className="border rounded-lg px-3 py-2"
      />
    </div>
  );
}