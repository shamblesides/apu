(module
  (type $t0 (func (param i32) (result i32)))
  (func $fib (export "fib") (type $t0) (param $n i32) (result i32)
    (local $n1 i32) (local $n2 i32) (local $n3 i32)
    i32.const 1
    set_local $n3
    loop $L0
      get_local $n2
      tee_local $n1
      get_local $n3
      tee_local $n2
      i32.add
      set_local $n3
      get_local $n
      if $I1
        get_local $n
        i32.const -1
        i32.add
        set_local $n
        br $L0
      end
    end
    get_local $n1))