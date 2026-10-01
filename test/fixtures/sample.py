def process(items):
    for item in items:
        if item.valid:
            save(item)
