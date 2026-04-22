function Or() {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          marginBottom: 24,
          marginTop: 24
        }}
      >
        <span
          style={{
            flex: 1,
            height: 1,
            background: "currentColor",
            opacity: 0.3
          }}
        />
        <span>or</span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: "currentColor",
            opacity: 0.3
          }}
        />
      </div>
    </>
  );
}

export default Or;
